import { create } from 'zustand';
import type { Message, WorldSummary } from '../types';
import { worlds, messages, events, updates, type GameEvent, type UpdateEvent } from '../services/api';

interface ChatState {
  // World list
  worldList: WorldSummary[];
  currentWorldId: string | null;
  currentWorld: WorldSummary | null;
  
  // Messages
  messageList: Message[];
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;
  
  // Game Events
  eventList: GameEvent[];
  hasMoreEvents: boolean;
  isLoadingEvents: boolean;
  
  // Processing state
  isProcessing: boolean;  // SSE-driven: true when GM is working (any user's request)
  isSending: boolean;     // Local: true while our HTTP request is in flight
  error: string | null;
  
  // Multi-user lock state
  worldLockedBy: string | null;  // user_id of who has the lock
  worldLockedCharacter: string | null;  // character name for display
  
  // Timestamps for detecting updates
  lastMessagesTimestamp: string | null;
  lastEventsTimestamp: string | null;
  
  // SSE connections
  eventSource: EventSource | null;  // Messages stream
  updatesEventSource: EventSource | null;  // Updates notifications stream
  
  // Actions
  loadWorlds: (autoSelect?: boolean) => Promise<void>;
  createWorld: (name: string) => Promise<string | null>;
  joinWorld: (code: string) => Promise<string | null>;
  selectWorld: (worldId: string) => Promise<void>;
  loadMessages: (before?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
  loadEvents: (before?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  worldList: [],
  currentWorldId: null,
  currentWorld: null,
  messageList: [],
  hasMoreMessages: false,
  isLoadingMessages: false,
  eventList: [],
  hasMoreEvents: false,
  isLoadingEvents: false,
  isProcessing: false,
  isSending: false,
  error: null,
  worldLockedBy: null,
  worldLockedCharacter: null,
  lastMessagesTimestamp: null,
  lastEventsTimestamp: null,
  eventSource: null,
  updatesEventSource: null,
  
  loadWorlds: async (autoSelect: boolean = false) => {
    try {
      const list = await worlds.list();
      set({ worldList: list });
      
      // Auto-select the first world (most recent activity) if requested and no world selected
      if (autoSelect && list.length > 0 && !get().currentWorldId) {
        await get().selectWorld(list[0].id);
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load worlds' });
    }
  },
  
  createWorld: async (name: string) => {
    try {
      const result = await worlds.create(name);
      // Reload worlds list to include the new world
      await get().loadWorlds();
      // Auto-select the new world
      await get().selectWorld(result.id);
      return result.id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create world' });
      return null;
    }
  },
  
  joinWorld: async (code: string) => {
    try {
      const result = await worlds.join(code);
      // Reload worlds list to include the joined world
      await get().loadWorlds();
      // Auto-select the joined world
      await get().selectWorld(result.world_id);
      return result.world_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to join world' });
      return null;
    }
  },
  
  selectWorld: async (worldId: string) => {
    const { eventSource, updatesEventSource, currentWorldId } = get();
    
    // Don't re-select same world
    if (worldId === currentWorldId) return;
    
    // Disconnect from previous world
    if (eventSource) {
      eventSource.close();
    }
    if (updatesEventSource) {
      updatesEventSource.close();
    }
    
    // Mark this world as viewed (updates last_viewed in DB and local state)
    const now = new Date().toISOString();
    set((state) => ({
      currentWorldId: worldId,
      currentWorld: state.worldList.find(w => w.id === worldId) || null,
      // Update last_viewed in local worldList to clear the "new activity" indicator
      worldList: state.worldList.map(w => 
        w.id === worldId ? { ...w, last_viewed: now } : w
      ),
      messageList: [],
      hasMoreMessages: false,
      eventList: [],
      hasMoreEvents: false,
      isProcessing: false,
      error: null,
      worldLockedBy: null,
      worldLockedCharacter: null,
      lastMessagesTimestamp: null,
      lastEventsTimestamp: null,
    }));
    
    // Load message history, events, and update last_viewed on backend in parallel
    await Promise.all([
      get().loadMessages(),
      get().loadEvents(),
      worlds.get(worldId).catch(() => {}), // Updates last_viewed on backend, ignore errors
    ]);
    
    // Connect messages SSE stream
    try {
      const es = messages.createStream(worldId);
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            // New message received - add to list if not already present
            const msg = data.message as Message;
            set((state) => {
              // Check if message already exists
              if (state.messageList.some(m => m.id === msg.id)) {
                return state;
              }
              return {
                messageList: [...state.messageList, msg],
              };
            });
          } else if (data.type === 'status') {
            // Clear timeout errors when processing completes
            if (!data.processing) {
              set({ isProcessing: false, error: null });
            } else {
              set({ isProcessing: true });
            }
          }
          // Ignore ping events
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      };
      
      es.onerror = (error) => {
        console.error('Messages SSE error:', error);
        // EventSource will auto-reconnect
      };
      
      set({ eventSource: es });
    } catch (e) {
      console.error('Failed to create messages SSE stream:', e);
    }
    
    // Connect updates SSE stream for multi-user sync
    try {
      const updatesEs = updates.createStream(worldId);
      
      updatesEs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as UpdateEvent;
          
          if (data.type === 'processing_started') {
            // Another user (or us) started interacting with GM
            set({
              isProcessing: true,
              worldLockedBy: data.locked_by,
              worldLockedCharacter: data.character_name,
            });
          } else if (data.type === 'processing_complete') {
            // GM finished - clear processing state
            set({
              isProcessing: false,
              worldLockedBy: null,
              worldLockedCharacter: null,
              lastMessagesTimestamp: data.messages_updated_at,
              lastEventsTimestamp: data.events_updated_at,
            });
            
            // Always refresh messages and events
            // (Message list deduplicates, so this is safe even if HTTP response already added them)
            get().loadMessages();
            get().loadEvents();
          } else if (data.type === 'connected') {
            console.log(`Connected to world updates, ${data.subscriber_count} subscribers`);
          }
          // Ignore ping events
        } catch (e) {
          console.error('Failed to parse updates SSE event:', e);
        }
      };
      
      updatesEs.onerror = (error) => {
        console.error('Updates SSE error:', error);
        // EventSource will auto-reconnect
      };
      
      set({ updatesEventSource: updatesEs });
    } catch (e) {
      console.error('Failed to create updates SSE stream:', e);
    }
  },
  
  loadMessages: async (before?: string) => {
    const { currentWorldId, isLoadingMessages } = get();
    if (!currentWorldId || isLoadingMessages) return;
    
    set({ isLoadingMessages: true });
    
    try {
      const result = await messages.getHistory(currentWorldId, {
        limit: 30,
        before,
      });
      
      set((state) => ({
        messageList: before
          ? [...result.messages, ...state.messageList]
          : result.messages,
        hasMoreMessages: result.has_more,
        isLoadingMessages: false,
      }));
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load messages',
        isLoadingMessages: false,
      });
    }
  },
  
  sendMessage: async (content: string) => {
    const { currentWorldId, isSending, isProcessing } = get();
    
    if (!currentWorldId) {
      set({ error: 'No world selected' });
      return;
    }
    
    if (isSending || isProcessing) {
      set({ error: 'Please wait for the current message to complete' });
      return;
    }
    
    // Only set isSending - let SSE drive isProcessing state
    set({ isSending: true, error: null });
    
    try {
      // This is a blocking call - waits for agent to respond
      const response = await messages.send(currentWorldId, content);
      
      // Messages will be added via SSE, but add them here too for immediate feedback
      // SSE handler will deduplicate
      set((state) => {
        const newMessages = [...state.messageList];
        
        // Add user message if not already present
        if (!newMessages.some(m => m.id === response.user_message.id)) {
          newMessages.push(response.user_message);
        }
        
        // Add GM message if present and not already there
        if (response.gm_message && !newMessages.some(m => m.id === response.gm_message!.id)) {
          newMessages.push(response.gm_message);
        }
        
        return {
          messageList: newMessages,
          isSending: false,
          // Note: isProcessing is cleared by SSE processing_complete event
        };
      });
      
      // Refresh events after successful message - scribe creates events at end of turn
      get().loadEvents();
    } catch (e: unknown) {
      const error = e as { status?: number; message?: string };
      const { isProcessing } = get();
      
      if (error.status === 409) {
        set({
          error: 'Another message is being processed. Please wait.',
          isSending: false,
        });
      } else if (isProcessing) {
        // The SSE stream indicates processing is still happening,
        // so this is likely a timeout - don't show a scary error
        set({
          error: 'Request timed out, but GM is still working...',
          isSending: false,
        });
      } else {
        set({
          error: error.message || 'Failed to send message',
          isSending: false,
        });
      }
    }
  },
  
  disconnect: () => {
    const { eventSource, updatesEventSource } = get();
    if (eventSource) {
      eventSource.close();
    }
    if (updatesEventSource) {
      updatesEventSource.close();
    }
    set({
      eventSource: null,
      updatesEventSource: null,
      currentWorldId: null,
      currentWorld: null,
      messageList: [],
      eventList: [],
      worldLockedBy: null,
      worldLockedCharacter: null,
    });
  },
  
  clearError: () => set({ error: null }),
  
  loadEvents: async (before?: string) => {
    const { currentWorldId, isLoadingEvents } = get();
    if (!currentWorldId || isLoadingEvents) return;
    
    set({ isLoadingEvents: true });
    
    try {
      const result = await events.list(currentWorldId, {
        limit: 30,
        before,
      });
      
      set((state) => ({
        // Prepend older events when paginating, replace on initial load
        eventList: before
          ? [...result.events, ...state.eventList]
          : result.events,
        hasMoreEvents: result.has_more,
        isLoadingEvents: false,
      }));
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load events',
        isLoadingEvents: false,
      });
    }
  },
}));

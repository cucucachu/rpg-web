import { create } from 'zustand';
import type { Message, WorldSummary } from '../types';
import { worlds, messages, events, type GameEvent } from '../services/api';

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
  isProcessing: boolean;
  isSending: boolean;
  error: string | null;
  
  // SSE connection
  eventSource: EventSource | null;
  
  // Actions
  loadWorlds: () => Promise<void>;
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
  eventSource: null,
  
  loadWorlds: async () => {
    try {
      const list = await worlds.list();
      set({ worldList: list });
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
    const { eventSource, currentWorldId } = get();
    
    // Don't re-select same world
    if (worldId === currentWorldId) return;
    
    // Disconnect from previous world
    if (eventSource) {
      eventSource.close();
    }
    
    set({
      currentWorldId: worldId,
      currentWorld: get().worldList.find(w => w.id === worldId) || null,
      messageList: [],
      hasMoreMessages: false,
      eventList: [],
      hasMoreEvents: false,
      isProcessing: false,
      error: null,
    });
    
    // Load message history and events in parallel
    await Promise.all([
      get().loadMessages(),
      get().loadEvents(),
    ]);
    
    // Connect SSE stream
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
        console.error('SSE error:', error);
        // EventSource will auto-reconnect
      };
      
      set({ eventSource: es });
    } catch (e) {
      console.error('Failed to create SSE stream:', e);
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
    
    set({ isSending: true, isProcessing: true, error: null });
    
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
          isProcessing: false,
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
          // Keep isProcessing true - world is still processing
        });
      } else if (isProcessing) {
        // The SSE stream indicates processing is still happening,
        // so this is likely a timeout - don't show a scary error
        set({
          error: 'Request timed out, but GM is still working...',
          isSending: false,
          // Keep isProcessing true - backend is still processing
        });
      } else {
        set({
          error: error.message || 'Failed to send message',
          isSending: false,
          isProcessing: false,
        });
      }
    }
  },
  
  disconnect: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
    }
    set({
      eventSource: null,
      currentWorldId: null,
      currentWorld: null,
      messageList: [],
      eventList: [],
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

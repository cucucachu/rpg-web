import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Message } from './Message';

export function MessageList() {
  const {
    messageList,
    hasMoreMessages,
    isLoadingMessages,
    loadMessages,
    isSending,
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  
  // Check if user is near bottom of scroll
  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    
    const threshold = 100;
    const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    isNearBottomRef.current = isNear;
    return isNear;
  }, []);
  
  // Auto-scroll to bottom only if already at bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageList, isSending]);
  
  // Load more on scroll to top
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    
    checkIfNearBottom();
    
    if (container.scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
      // Get the first message ID for pagination
      const firstMessage = messageList[0];
      if (firstMessage) {
        loadMessages(firstMessage.id);
      }
    }
  };
  
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto"
      style={{ 
        backgroundColor: 'var(--bg-base)',
        scrollbarWidth: 'none',
      }}
    >
      {/* Load more indicator */}
      {isLoadingMessages && (
        <div className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
          loading...
        </div>
      )}
      
      {hasMoreMessages && !isLoadingMessages && (
        <div className="py-2 text-center">
          <button
            onClick={() => {
              const firstMessage = messageList[0];
              if (firstMessage) loadMessages(firstMessage.id);
            }}
            className="text-sm transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            load older messages
          </button>
        </div>
      )}
      
      {/* Messages */}
      {messageList.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      {/* Sending indicator - immediate feedback while HTTP request is in flight */}
      {/* Note: Processing state (GM thinking) is shown in AgentStatus via SSE */}
      {isSending && (
        <div className="py-4 px-6">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <span 
              className="inline-block w-2 h-2 rounded-full animate-pulse" 
              style={{ backgroundColor: 'var(--accent-dim)' }} 
            />
            <span className="text-sm">sending...</span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

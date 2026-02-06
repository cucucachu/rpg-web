import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';

export function MessageInput() {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    currentWorld, 
    sendMessage, 
    isSending, 
    isProcessing, 
    error,
    clearError,
  } = useChatStore();
  
  const isDisabled = !currentWorld || isSending || isProcessing;
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);
  
  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);
  
  // Refocus input when processing completes
  useEffect(() => {
    if (!isProcessing && !isSending && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isProcessing, isSending]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = message.trim();
    if (!trimmed || isDisabled) return;
    
    setMessage('');
    await sendMessage(trimmed);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const placeholder = isProcessing 
    ? 'waiting for response...' 
    : currentWorld?.character_name 
      ? `> ${currentWorld.character_name}` 
      : '> message';
  
  return (
    <div className="px-3 py-2 md:px-4 md:py-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {error && (
        <div 
          className="mb-2 px-3 py-2 text-sm rounded"
          style={{ 
            backgroundColor: 'rgba(220, 50, 50, 0.1)',
            color: '#dc3232',
          }}
        >
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className="flex-1 px-3 py-3 md:py-2 resize-none focus:outline-none text-base md:text-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            borderRadius: '4px',
            opacity: isDisabled ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={isDisabled || !message.trim()}
          className="px-5 py-3 md:px-4 md:py-2 text-sm font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: isDisabled || !message.trim() 
              ? 'var(--bg-elevated)' 
              : 'var(--accent)',
            color: isDisabled || !message.trim() 
              ? 'var(--text-muted)' 
              : 'var(--bg-base)',
            borderRadius: '4px',
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          {isSending ? '...' : 'send'}
        </button>
      </form>
    </div>
  );
}

import { useChatStore } from '../../stores/chatStore';

const STEP_LABELS: Record<string, string> = {
  loading:       'loading context...',
  historian:     'historian is researching...',
  barrister:     'analyzing mechanics...',
  gm:            'GM is writing...',
  finalizing:    'recording events...',
  world_creator: 'building the world...',
  char_creator:  'creating character...',
};

export function AgentStatus() {
  const { isProcessing, isSending, processingStep, error, clearError } = useChatStore();
  
  const isActive = isSending || isProcessing;
  
  if (!isActive && !error) {
    return null;
  }
  
  const isSoftError = isActive && error;

  const statusMessage = isSending
    ? 'sending...'
    : (processingStep ? (STEP_LABELS[processingStep] ?? 'GM is thinking...') : 'GM is thinking...');
  
  return (
    <div 
      className="px-4 py-2 text-xs border-t flex items-center justify-between"
      style={{ 
        backgroundColor: (error && !isSoftError) ? 'var(--status-error-bg)' : 'var(--bg-elevated)',
        borderColor: 'var(--border-subtle)',
        color: (error && !isSoftError) ? 'var(--status-error)' : 'var(--text-muted)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isActive && (
          <>
            {/* Animated typing indicator */}
            <span className="flex gap-1 items-center flex-shrink-0">
              <span 
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: 'var(--accent-primary)', animationDelay: '0ms', animationDuration: '0.6s' }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: 'var(--accent-primary)', animationDelay: '150ms', animationDuration: '0.6s' }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: 'var(--accent-primary)', animationDelay: '300ms', animationDuration: '0.6s' }}
              />
            </span>
            <span className="flex-shrink-0">{statusMessage}</span>
            {isSoftError && (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                — request timed out but still working
              </span>
            )}
          </>
        )}
        {!isActive && error && (
          <span>{error}</span>
        )}
      </div>
      
      {/* Dismiss button for non-active errors */}
      {!isActive && error && (
        <button
          onClick={clearError}
          className="px-2 py-0.5 text-xs rounded hover:bg-opacity-80 transition-colors flex-shrink-0"
          style={{ 
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-muted)',
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

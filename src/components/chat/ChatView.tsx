import { useState, useRef, useCallback, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentStatus } from './AgentStatus';
import { EventList } from '../events/EventList';

// Hook to detect mobile vs desktop based on Tailwind's md breakpoint (768px)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    // Set initial value
    setIsMobile(mediaQuery.matches);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return isMobile;
}

// Narrative pane content - extracted to avoid recreating on every render
function NarrativePane() {
  return (
    <div className="flex flex-col min-h-0 h-full overflow-hidden">
      {/* Messages - scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList />
      </div>
      
      {/* Agent status indicator */}
      <AgentStatus />
      
      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0">
        <MessageInput />
      </div>
    </div>
  );
}

// Records pane content - extracted to avoid recreating on every render
function RecordsPane() {
  return (
    <div className="flex-1 min-h-0 h-full overflow-hidden">
      <EventList />
    </div>
  );
}

export function ChatView() {
  const { currentWorld } = useChatStore();
  const [chatWidthPercent, setChatWidthPercent] = useState(66); // Chat takes 2/3 by default
  const [activeTab, setActiveTab] = useState<'narrative' | 'records'>('narrative'); // Mobile tab state
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isMobile = useIsMobile();
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Clamp between 30% and 80%
      setChatWidthPercent(Math.max(30, Math.min(80, newPercent)));
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);
  
  if (!currentWorld) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">select a world to begin</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-2 md:py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
          {currentWorld.name}
        </span>
        {currentWorld.character_name && (
          <span className="text-xs ml-2 truncate" style={{ color: 'var(--text-muted)' }}>
            playing as {currentWorld.character_name}
          </span>
        )}
      </div>
      
      {/* Conditionally render mobile OR desktop layout (not both) */}
      {isMobile ? (
        <>
          {/* Mobile Tab Bar */}
          <div 
            className="flex border-b"
            style={{ 
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('narrative')}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'narrative' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'narrative' ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              Narrative
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'records' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'records' ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              Records
            </button>
          </div>
          
          {/* Mobile Content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTab === 'narrative' ? <NarrativePane /> : <RecordsPane />}
          </div>
        </>
      ) : (
        /* Desktop Split Pane */
        <div ref={containerRef} className="flex-1 min-h-0 flex">
          {/* Narrative pane */}
          <div 
            className="flex flex-col min-h-0"
            style={{ width: `${chatWidthPercent}%` }}
          >
            {/* Narrative header */}
            <div 
              className="px-4 py-2 text-xs font-medium border-b"
              style={{ 
                color: 'var(--text-muted)', 
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Narrative
            </div>
            
            <NarrativePane />
          </div>
          
          {/* Draggable divider */}
          <div
            onMouseDown={handleMouseDown}
            className="w-1 flex-shrink-0 cursor-col-resize hover:bg-opacity-50 transition-colors"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--border-subtle)'}
          />
          
          {/* Records pane */}
          <div 
            className="flex flex-col min-h-0"
            style={{ width: `${100 - chatWidthPercent}%` }}
          >
            {/* Records header */}
            <div 
              className="px-4 py-2 text-xs font-medium border-b"
              style={{ 
                color: 'var(--text-muted)', 
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Records
            </div>
            
            <RecordsPane />
          </div>
        </div>
      )}
    </div>
  );
}

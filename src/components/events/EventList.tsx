import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { EventItem } from './EventItem';

export function EventList() {
  const {
    eventList,
    hasMoreEvents,
    isLoadingEvents,
    loadEvents,
  } = useChatStore();
  
  const eventsEndRef = useRef<HTMLDivElement>(null);
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
  
  // Auto-scroll to bottom when new events arrive (if already near bottom)
  useEffect(() => {
    if (isNearBottomRef.current) {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventList]);
  
  // Load older events when scrolling to top
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    
    checkIfNearBottom();
    
    // Load older events when scrolled to top
    if (container.scrollTop === 0 && hasMoreEvents && !isLoadingEvents) {
      const firstEvent = eventList[0];
      if (firstEvent) {
        loadEvents(firstEvent.id);
      }
    }
  };
  
  if (eventList.length === 0 && !isLoadingEvents) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="text-center" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">no records yet</p>
          <p className="text-xs mt-1">records will appear as the game progresses</p>
        </div>
      </div>
    );
  }
  
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
      {/* Load more indicator at top */}
      {isLoadingEvents && (
        <div className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
          loading...
        </div>
      )}
      
      {/* Load older button at top */}
      {hasMoreEvents && !isLoadingEvents && (
        <div className="py-2 text-center">
          <button
            onClick={() => {
              const firstEvent = eventList[0];
              if (firstEvent) loadEvents(firstEvent.id);
            }}
            className="text-sm transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            load older records
          </button>
        </div>
      )}
      
      {/* Events - chronological order (oldest at top, newest at bottom) */}
      {eventList.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
      
      <div ref={eventsEndRef} />
    </div>
  );
}

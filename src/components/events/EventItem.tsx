import type { GameEvent } from '../../services/api';

interface EventItemProps {
  event: GameEvent;
}

/**
 * Format game time (seconds) into a readable format like "Day 1, 09:30"
 */
function formatGameTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  
  if (days > 0) {
    return `Day ${days + 1}, ${timeStr}`;
  }
  return timeStr;
}

export function EventItem({ event }: EventItemProps) {
  const gameTimeStr = formatGameTime(event.game_time);
  
  return (
    <div 
      className="py-3 px-6 border-b"
      style={{ 
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Event Header */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span 
          className="text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          {event.name}
        </span>
        <span 
          className="text-xs flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          {gameTimeStr}
        </span>
      </div>
      
      {/* Description */}
      {event.description && (
        <div 
          className="text-sm whitespace-pre-wrap mb-2"
          style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}
        >
          {event.description}
        </div>
      )}
      
      {/* Participants */}
      {event.participants && (
        <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Participants: </span>
          {event.participants}
        </div>
      )}
      
      {/* Changes */}
      {event.changes && (
        <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Changes: </span>
          {event.changes}
        </div>
      )}
      
      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.map((tag, i) => (
            <span 
              key={i}
              className="text-xs px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: 'var(--bg-elevated)', 
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

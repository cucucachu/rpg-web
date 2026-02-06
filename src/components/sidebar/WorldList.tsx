import { useEffect, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';

type Mode = 'idle' | 'creating' | 'joining';

interface WorldListProps {
  onCloseSidebar?: () => void;
}

export function WorldList({ onCloseSidebar }: WorldListProps) {
  const { worldList, currentWorldId, loadWorlds, selectWorld, createWorld, joinWorld } = useChatStore();
  const [mode, setMode] = useState<Mode>('idle');
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    loadWorlds();
  }, [loadWorlds]);
  
  const handleCreateWorld = async () => {
    if (!inputValue.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    await createWorld(inputValue.trim());
    setIsSubmitting(false);
    setMode('idle');
    setInputValue('');
  };
  
  const handleJoinWorld = async () => {
    if (!inputValue.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    await joinWorld(inputValue.trim());
    setIsSubmitting(false);
    setMode('idle');
    setInputValue('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'creating') handleCreateWorld();
      else if (mode === 'joining') handleJoinWorld();
    } else if (e.key === 'Escape') {
      setMode('idle');
      setInputValue('');
    }
  };
  
  const cancelAction = () => {
    setMode('idle');
    setInputValue('');
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>worlds</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {worldList.length === 0 ? (
          <div className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            No worlds yet.
          </div>
        ) : (
          <ul>
            {worldList.map((world) => (
              <li key={world.id}>
                <button
                  onClick={() => {
                    selectWorld(world.id);
                    onCloseSidebar?.();
                  }}
                  className="w-full px-4 py-2 text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: currentWorldId === world.id ? 'var(--bg-hover)' : 'transparent',
                    color: currentWorldId === world.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (currentWorldId !== world.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentWorldId !== world.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="font-medium text-sm">{world.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {world.role === 'god' ? '⚡ god' : world.character_name || 'mortal'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="px-4 py-3 space-y-2">
        {mode !== 'idle' ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={mode === 'creating' ? 'World name...' : 'World code...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={isSubmitting}
              className="w-full px-3 py-1.5 text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={mode === 'creating' ? handleCreateWorld : handleJoinWorld}
                disabled={!inputValue.trim() || isSubmitting}
                className="flex-1 px-3 py-1.5 text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--accent)',
                }}
              >
                {isSubmitting 
                  ? (mode === 'creating' ? 'creating...' : 'joining...') 
                  : (mode === 'creating' ? 'create' : 'join')}
              </button>
              <button
                onClick={cancelAction}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm transition-colors cursor-pointer"
                style={{
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              className="w-full px-3 py-1.5 text-sm transition-colors cursor-pointer"
              style={{ 
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-elevated)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
              onClick={() => setMode('creating')}
            >
              + create world
            </button>
            <button
              className="w-full px-3 py-1.5 text-sm transition-colors cursor-pointer"
              style={{ 
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-elevated)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
              onClick={() => setMode('joining')}
            >
              + join world
            </button>
          </>
        )}
      </div>
    </div>
  );
}

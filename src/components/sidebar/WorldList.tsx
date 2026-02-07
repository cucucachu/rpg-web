import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore } from '../../stores/chatStore';
import { worlds } from '../../services/api';

type Mode = 'idle' | 'creating' | 'joining';

interface WorldListProps {
  onCloseSidebar?: () => void;
}

export function WorldList({ onCloseSidebar }: WorldListProps) {
  const { worldList, currentWorldId, loadWorlds, selectWorld, createWorld, joinWorld } = useChatStore();
  const [mode, setMode] = useState<Mode>('idle');
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Menu state
  const [menuOpenForWorld, setMenuOpenForWorld] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Invite code modal state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteWorldName, setInviteWorldName] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenForWorld(null);
      }
    };
    
    if (menuOpenForWorld) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpenForWorld]);
  
  const handleGenerateInvite = async (worldId: string, worldName: string) => {
    setMenuOpenForWorld(null);
    setIsGeneratingCode(true);
    setInviteWorldName(worldName);
    
    try {
      const result = await worlds.createWorldCode(worldId);
      setInviteCode(result.code);
    } catch (e) {
      console.error('Failed to create invite code:', e);
      alert('Failed to create invite code');
    } finally {
      setIsGeneratingCode(false);
    }
  };
  
  const handleCopyCode = async () => {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const closeInviteModal = () => {
    setInviteCode(null);
    setInviteWorldName('');
    setCopied(false);
  };
  
  useEffect(() => {
    // Auto-select most recent world on initial load
    loadWorlds(true);
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
              <li key={world.id} className="relative group">
                <div className="flex items-center">
                  {/* New activity indicator - show if last_activity > last_viewed and not currently selected */}
                  {world.last_activity && 
                   (!world.last_viewed || world.last_activity > world.last_viewed) && 
                   currentWorldId !== world.id && (
                    <span 
                      className="absolute left-1.5 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                      title="New activity"
                    />
                  )}
                  <button
                    onClick={() => {
                      selectWorld(world.id);
                      onCloseSidebar?.();
                    }}
                    className="flex-1 min-w-0 px-4 py-2 text-left transition-colors cursor-pointer"
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
                    <div className="font-medium text-sm truncate">{world.name}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {world.role === 'god' ? '⚡ god' : world.character_name || 'mortal'}
                    </div>
                  </button>
                  
                  {/* Menu button - only show for gods */}
                  {world.role === 'god' && (
                    <div className="relative" ref={menuOpenForWorld === world.id ? menuRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenForWorld(menuOpenForWorld === world.id ? null : world.id);
                        }}
                        className="px-2 py-2 cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        •••
                      </button>
                      
                      {/* Dropdown menu */}
                      {menuOpenForWorld === world.id && (
                        <div
                          className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg z-50 min-w-[160px]"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <button
                            onClick={() => handleGenerateInvite(world.id, world.name)}
                            className="w-full px-3 py-2 text-left text-sm transition-colors cursor-pointer"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            Invite a friend
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
      
      {/* Invite Code Modal - rendered via portal to ensure viewport centering */}
      {(inviteCode || isGeneratingCode) && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={closeInviteModal}
        >
          <div
            className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-4"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 
              className="text-lg font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Invite to {inviteWorldName}
            </h3>
            
            {isGeneratingCode ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Generating invite code...
              </p>
            ) : (
              <>
                <p 
                  className="text-sm mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Share this code with a friend to let them join your world:
                </p>
                
                <div 
                  className="flex items-center gap-2 p-3 rounded mb-4"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <code 
                    className="flex-1 text-lg font-mono tracking-wider"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {inviteCode}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 text-sm rounded transition-colors cursor-pointer"
                    style={{
                      backgroundColor: copied ? 'var(--status-success-bg)' : 'var(--accent)',
                      color: copied ? 'var(--status-success)' : 'var(--text-primary)',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                
                <p 
                  className="text-xs mb-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  This code expires in 7 days.
                </p>
                
                <button
                  onClick={closeInviteModal}
                  className="w-full px-4 py-2 text-sm rounded transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

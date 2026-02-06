import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { WorldList } from '../sidebar/WorldList';
import { ChatView } from '../chat/ChatView';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { disconnect } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/login');
  };
  
  const closeSidebar = () => setSidebarOpen(false);
  
  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Top bar */}
      <header className="h-12 px-2 md:px-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center">
          {/* Hamburger menu - mobile only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 mr-2 text-lg"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h1 className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>the conjurer's table</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <span 
            className="truncate max-w-20 md:max-w-none"
            style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}
          >
            {user?.display_name}
          </span>
          <button
            onClick={handleLogout}
            className="px-2 py-1 text-sm transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            logout
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={closeSidebar}
          />
        )}
        
        {/* Sidebar - slide-out on mobile, fixed on desktop */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
            md:relative md:translate-x-0 md:w-56 md:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ backgroundColor: 'var(--bg-surface)', top: '48px' }}
        >
          <WorldList onCloseSidebar={closeSidebar} />
        </aside>
        
        {/* Chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatView />
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function RegisterForm() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await register(email, password, displayName, inviteCode);
      navigate('/');
    } catch {
      // Error is handled by the store
    }
  };
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div 
        className="w-full max-w-sm p-6 rounded"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <h1 
          className="text-xl font-medium mb-6 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          register
        </h1>
        
        {error && (
          <div 
            className="mb-4 p-3 rounded text-sm"
            style={{ 
              backgroundColor: 'rgba(220, 50, 50, 0.1)',
              color: '#dc3232',
            }}
          >
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              className="block text-sm mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              invite code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          
          <div>
            <label 
              className="block text-sm mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          
          <div>
            <label 
              className="block text-sm mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          
          <div>
            <label 
              className="block text-sm mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded text-sm font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-base)',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? 'creating account...' : 'create account'}
          </button>
        </form>
        
        <p 
          className="mt-4 text-sm text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          already have an account?{' '}
          <Link 
            to="/login"
            className="hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

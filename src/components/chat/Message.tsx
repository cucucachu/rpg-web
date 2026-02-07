import type { Message as MessageType } from '../../types';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface MessageProps {
  message: MessageType;
}

// Custom markdown components to match our aesthetic
const markdownComponents: Components = {
  // Headers - keep them small and subtle
  h1: ({ children }) => (
    <h1 className="text-base font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-medium mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </h4>
  ),
  // Paragraphs
  p: ({ children }) => (
    <p className="mb-4 last:mb-0" style={{ lineHeight: '1.7' }}>
      {children}
    </p>
  ),
  // Bold and italic
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </em>
  ),
  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-2 ml-2 space-y-0.5">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-2 ml-2 space-y-0.5">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </li>
  ),
  // Code
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code 
          className="px-1 py-0.5 rounded text-xs"
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--accent)',
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre 
      className="p-2 rounded text-xs overflow-x-auto mb-2"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      {children}
    </pre>
  ),
  // Blockquotes - good for GM narrative emphasis
  blockquote: ({ children }) => (
    <blockquote 
      className="border-l-2 pl-3 my-2 italic"
      style={{ 
        borderColor: 'var(--accent-dim)',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </blockquote>
  ),
  // Horizontal rules
  hr: () => (
    <hr 
      className="my-3 border-0 h-px"
      style={{ backgroundColor: 'var(--border-subtle)' }}
    />
  ),
  // Links
  a: ({ children, href }) => (
    <a 
      href={href}
      className="underline"
      style={{ color: 'var(--accent)' }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

export function Message({ message }: MessageProps) {
  const isGM = message.message_type === 'gm';
  const isSystem = message.message_type === 'system';
  
  // Format timestamp
  const time = new Date(message.created_at);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isSystem) {
    return (
      <div className="py-2 px-6 text-center">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {message.content}
        </span>
      </div>
    );
  }
  
  if (isGM) {
    // GM messages - narrative style with markdown rendering
    return (
      <div className="py-4 px-6">
        <div style={{ color: 'var(--text-primary)' }}>
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {timeStr}
        </div>
      </div>
    );
  }
  
  // Player messages
  // Format: "username as charactername timestamp" or just "username timestamp" if no character
  const showAsCharacter = message.display_name && message.character_name && message.display_name !== message.character_name;
  
  return (
    <div className="py-3 px-6">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          {message.display_name || message.character_name}
        </span>
        {showAsCharacter && (
          <>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>as</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {message.character_name}
            </span>
          </>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {timeStr}
        </span>
      </div>
      <div 
        className="whitespace-pre-wrap pl-0" 
        style={{ color: 'var(--text-secondary)' }}
      >
        {message.content}
      </div>
    </div>
  );
}

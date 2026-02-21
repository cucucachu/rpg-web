import { useState } from 'react';
import { createPortal } from 'react-dom';
import { messages } from '../../services/api';

interface BugReportModalProps {
  worldId: string;
  messageId: string;
  onClose: () => void;
}

export function BugReportModal({ worldId, messageId, onClose }: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await messages.reportBug(worldId, messageId, description.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-2">
            <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Report submitted. Thanks for the feedback.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Report an Issue
            </h2>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue with this GM response..."
              rows={5}
              className="w-full text-sm rounded p-3 mb-4 resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'inherit',
              }}
              disabled={isSubmitting}
              autoFocus
            />

            {error && (
              <div className="text-xs mb-3" style={{ color: '#e57373' }}>
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded"
                style={{
                  backgroundColor: description.trim() && !isSubmitting ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  color: description.trim() && !isSubmitting ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  cursor: description.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                }}
                disabled={!description.trim() || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

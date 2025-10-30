"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useToast } from "./Toast";
import { getClient, getAccessToken } from '@/src/lib/api/client';

interface ReportButtonProps {
  postId?: string;
  commentId?: string;
  className?: string;
}

export function ReportButton({ postId, commentId, className = "" }: ReportButtonProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const toast = useToast();

  const handleReport = async (reason: string, details?: string) => {
    if (!postId && !commentId) return;

    setIsReporting(true);
    try {
      const sb = getClient();
      const token = await getAccessToken(sb);
      
      const endpoint = postId ? '/api/reports/post' : '/api/reports/comment';
      const body = postId
        ? { postId, reason, details }
        : { commentId, reason, details };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.show('Report submitted successfully');
        setShowModal(false);
      } else {
        toast.show(data.error || 'Failed to submit report');
      }
    } catch (error) {
      toast.show('Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <button
        className={`action report ${className}`}
        title="Report content"
        aria-label="Report this content"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        <Flag size={16} />
      </button>

      {showModal && (
        <ReportModal
          onClose={() => setShowModal(false)}
          onSubmit={handleReport}
          isSubmitting={isReporting}
          type={postId ? 'post' : 'comment'}
        />
      )}
    </>
  );
}

interface ReportModalProps {
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => void;
  isSubmitting: boolean;
  type: 'post' | 'comment';
}

function ReportModal({ onClose, onSubmit, isSubmitting, type }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reasons = [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onSubmit(reason, details.trim() || undefined);
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="report-reasons">
            {reasons.map((r) => (
              <label key={r.value} className="report-reason" onClick={() => setReason(r.value)}>
                <span className={reason === r.value ? 'selected' : ''}>{r.label}</span>
              </label>
            ))}
          </div>

          <textarea
            placeholder="Additional details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
          />

          <div className="report-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={!reason || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .report-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .report-modal {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          color: white;
          text-align: center;
        }

        .report-reasons {
          margin-bottom: 16px;
        }

        .report-reason {
          display: block;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .report-reason span.selected {
          text-decoration: underline;
          text-decoration-color: var(--primary);
        }

        .report-modal textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #444;
          border-radius: 4px;
          background: #2a2a2a;
          color: white;
          resize: none;
        }

        .report-actions {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 16px;
        }

        .report-actions button {
          padding: 8px 16px;
          border: 1px solid #444;
          border-radius: 4px;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }

        .report-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
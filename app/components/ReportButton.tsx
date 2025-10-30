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
        <h3>Report {type}</h3>
        <form onSubmit={handleSubmit}>
          <div className="report-reasons">
            {reasons.map((r) => (
              <label key={r.value} className="report-reason">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
                <span>{r.label}</span>
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
        }

        .report-modal h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .report-reasons {
          margin-bottom: 16px;
        }

        .report-reason {
          display: block;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .report-reason input[type="radio"] {
          appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #444;
          border-radius: 50%;
          background: #1a1a1a;
          position: relative;
          margin-right: 8px;
          vertical-align: middle;
        }

        .report-reason input[type="radio"]:checked {
          background: var(--primary);
          border-color: var(--primary);
        }

        .report-reason input[type="radio"]:checked::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
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
          justify-content: flex-end;
          margin-top: 16px;
        }

        .report-actions button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .report-actions button:first-child {
          background: var(--button-secondary-bg);
          color: white;
        }

        .report-actions button:last-child {
          background: var(--accent-color);
          color: white;
        }

        .report-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
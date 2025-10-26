"use client";

import { useState } from "react";
import { Button } from "./Button";

interface InviteSectionProps {
  isVisible?: boolean;
}

export function InviteSection({ isVisible = true }: InviteSectionProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!resp.ok) {
        throw new Error('Failed to generate invite');
      }
      const data = await resp.json();
      setInviteCode(data.code);
    } catch (error) {
      console.error('Error generating invite:', error);
      alert('Failed to generate invite code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="invite-panel invite-panel-enter">
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Invite Friends</h3>
      <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Generate a unique invite code to share with friends. You get one code per day that stays valid until someone uses it.
      </p>
      {!inviteCode ? (
        <Button onClick={generateInvite} loading={loading} style={{ width: '100%' }}>
          Generate Invite Code
        </Button>
      ) : (
        <>
          <input
            value={copied ? "Copied to clipboard!" : inviteCode}
            readOnly
            onClick={copyToClipboard}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--bg)',
              color: 'var(--text)',
              fontFamily: 'monospace',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          />
        </>
      )}
    </div>
  );
}
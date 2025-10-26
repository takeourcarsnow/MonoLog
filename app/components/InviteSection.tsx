"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Copy, Check } from "lucide-react";

export function InviteSection() {
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
    <div style={{ margin: '20px auto', maxWidth: 600, padding: '16px', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Invite Friends</h3>
      <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Generate an invite code to share with friends who want to join MonoLog.
      </p>
      {!inviteCode ? (
        <Button onClick={generateInvite} loading={loading} style={{ width: '100%' }}>
          Generate Invite Code
        </Button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={inviteCode}
            readOnly
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--bg)',
              color: 'var(--text)',
              fontFamily: 'monospace',
            }}
          />
          <Button onClick={copyToClipboard} variant="ghost" style={{ padding: '8px 12px' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
      )}
    </div>
  );
}
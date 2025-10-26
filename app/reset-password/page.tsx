"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/src/lib/api/supabase";
import { Button } from "@/app/components/Button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessTokenFromQuery = searchParams.get('access_token');
  const refreshTokenFromQuery = searchParams.get('refresh_token');
  const [accessToken, setAccessToken] = useState<string | null>(accessTokenFromQuery);
  const [refreshToken, setRefreshToken] = useState<string | null>(refreshTokenFromQuery);

  useEffect(() => {
    // If tokens already available from query params, set session. Otherwise try parsing URL fragment (#access_token=...)
    const tryParseFragment = () => {
      try {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash || '';
        if (!hash) return;
        // Convert the hash into a query-like string so URLSearchParams can parse it
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const at = params.get('access_token');
        const rt = params.get('refresh_token');
        if (at) setAccessToken(at);
        if (rt) setRefreshToken(rt);
        // Clear the hash so tokens aren't left in the URL
        if (at || rt) {
          try {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    // If we already have tokens from query use them; otherwise try fragment
    if (accessToken || refreshToken) {
      const sb = getSupabaseClient();
      sb.auth.setSession({ access_token: accessToken || '', refresh_token: refreshToken || '' });
    } else {
      tryParseFragment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, refreshToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const sb = getSupabaseClient();
      const { error } = await sb.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="view-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h1 style={{ marginBottom: 16 }}>Password Reset Successful</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your password has been updated. You will be redirected shortly.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: 24 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Reset Your Password</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: 8 }}>
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input fancy-input"
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: 8 }}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input fancy-input"
              placeholder="Confirm new password"
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--error)', textAlign: 'center', padding: 8, background: 'var(--error-bg)', borderRadius: 4 }}>
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
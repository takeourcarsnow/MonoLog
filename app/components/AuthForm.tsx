"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import './AuthConfirmButton.css';
import { useHeaderNotice } from "./auth/authHooks";
import { AuthHeaderNotice } from "./auth/AuthHeaderNotice";
import { AuthToggle } from "./auth/AuthToggle";
import { AuthInputs } from "./auth/AuthInputs";
import { AuthButton } from "./auth/AuthButton";
import { AuthMessage } from "./auth/AuthMessage";
import { validUsername } from "./auth/authUtils";
import { signIn, signUp, checkUsernameAvailability } from "./auth/authActions";

export function AuthForm({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [signupSent, setSignupSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasSuccess, setHasSuccess] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();
  const toast = useToast();
  const { headerNotice, headerNoticePhase, showHeaderNotice, setHeaderNotice } = useHeaderNotice();

  const isUsernameValid = validUsername(username || "");

  async function submit(e?: any) {
    e?.preventDefault();
    const start = Date.now();
    const MIN_MS = 2000; /* minimum time to show loading animation (ms) */
    setLoading(true);

    let shouldCloseAndRefresh = false;
    try {
      if (mode === "signin") {
        await signIn(email, password);
        shouldCloseAndRefresh = true;
        setHasSuccess(true);
        setJustSignedIn(true);
      } else {
        // Client-side validation before contacting server
        const emailOk = typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
        if (!emailOk) {
          setLoading(false);
          showHeaderNotice({ title: 'Invalid email', subtitle: 'Please enter a valid email address.', variant: 'warn' }, 4000);
          return;
        }
        if (!password || password.length < 8) {
          setLoading(false);
          showHeaderNotice({ title: 'Password too short', subtitle: 'Password must be at least 8 characters.', variant: 'warn' }, 4500);
          return;
        }

        if (!username || !username.trim()) {
          setLoading(false);
          showHeaderNotice({ title: 'Enter a username', subtitle: 'Please choose a username to continue.', variant: 'warn' }, 4500);
          return;
        }
        const chosen = username.trim().toLowerCase();
        if (!validUsername(chosen)) {
          setLoading(false);
          showHeaderNotice({ title: 'Username too short', subtitle: "3–32 chars; letters, numbers, '-' or '_'.", variant: 'warn' }, 4500);
          return;
        }

        const available = await checkUsernameAvailability(chosen);
        if (!available) {
          setLoading(false);
          showHeaderNotice({ title: 'That username is taken', subtitle: 'Please choose another username.', variant: 'warn' }, 4500);
          return;
        }

        await signUp(email, password, chosen);
        setSignupSent(true);
        setMode("signin");
        const elapsedSignup = Date.now() - start;
        const remainingSignup = Math.max(0, MIN_MS - elapsedSignup);
        if (remainingSignup > 0) await new Promise((res) => setTimeout(res, remainingSignup));
        showHeaderNotice({ title: 'Next steps', subtitle: 'If the chosen details were accepted, we will email instructions to complete account setup.', variant: 'info' }, 4500);
        return;
      }
    } catch (err: any) {
      setHasError(true);
      const raw = err?.message || String(err || 'An error occurred');
      const lower = String(raw).toLowerCase();

      if (lower.includes('too many attempts') || lower.includes('rate limit') || lower.includes('temporarily blocked')) {
        showHeaderNotice({ title: 'Too many attempts', subtitle: raw, variant: 'error' }, 6000);
      } else if (mode === 'signin') {
        const signinLeakPatterns = [/user not found/i, /no user/i, /not found/i, /invalid login/i, /invalid credentials/i, /wrong password/i, /password.*incorrect/i, /cannot find user/i, /email not found/i];
        const matchesLeak = signinLeakPatterns.some((rx) => rx.test(raw));
        if (matchesLeak) {
          showHeaderNotice({ title: 'Invalid login credentials', variant: 'error' }, 3500);
        } else {
          showHeaderNotice({ title: 'Invalid login credentials', variant: 'error' }, 3500);
        }
      } else {
        try { setMode('signin'); } catch (_) {}
        showHeaderNotice({ title: 'Next steps', subtitle: 'If the chosen details were accepted, we will email instructions to complete account setup.', variant: 'info' }, 4000);
      }
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_MS - elapsed);
      if (remaining > 0) {
        await new Promise((res) => setTimeout(res, remaining));
      }
      setLoading(false);
      setTimeout(() => setHasError(false), 2000);

      if (shouldCloseAndRefresh) {
        try {
          if (justSignedIn) {
            await new Promise((r) => setTimeout(r, 900));
          }
        } catch (_) { /* ignore timing errors */ }
        try { window.dispatchEvent(new CustomEvent('auth:changed')); } catch (e) { /* ignore */ }
        if (onClose) {
          try { await onClose(); } catch (_) { /* ignore */ }
        }
        try { router.refresh(); } catch (_) { /* ignore */ }
        setHasSuccess(false);
        setJustSignedIn(false);
      }
    }
  }

  // Clear header notice when user edits inputs
  useEffect(() => {
    if (headerNotice) setHeaderNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  return (
    <form
      onSubmit={submit}
      className={`auth-form enhanced auth-form-tight mode-${mode}`}
      aria-label="Sign in or sign up"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      {/* Dynamic message or header notice (auth related) */}
      <div className="auth-header-area" aria-hidden={false}>
        {headerNotice ? (
          <AuthHeaderNotice headerNotice={headerNotice} headerNoticePhase={headerNoticePhase} />
        ) : (
          <AuthMessage mode={mode} />
        )}
      </div>

      <AuthToggle mode={mode} setMode={setMode} />

      <AuthInputs
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        username={username}
        setUsername={setUsername}
        mode={mode}
      />

      <AuthButton
        mode={mode}
        loading={loading}
        hasError={hasError}
        hasSuccess={hasSuccess}
        justSignedIn={justSignedIn}
        signupSent={signupSent}
        onSubmit={submit}
      />
    </form>
  );
}


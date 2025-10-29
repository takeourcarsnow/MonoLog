"use client";

import './AuthConfirmButton.css';
import { AuthHeaderNotice } from "./auth/AuthHeaderNotice";
import { AuthToggle } from "./auth/AuthToggle";
import { AuthInputs } from "./auth/AuthInputs";
import { AuthButton } from "./auth/AuthButton";
import { AuthMessage } from "./auth/AuthMessage";
import { useAuthForm } from "./auth/useAuthForm";
import { useEffect } from "react";

export function AuthForm({ onClose }: { onClose?: () => void }) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    username,
    setUsername,
    inviteCode,
    setInviteCode,
    signupSent,
    loading,
    hasError,
    hasSuccess,
    justSignedIn,
    mode,
    setMode,
    headerNotice,
    headerNoticePhase,
    emailWarning,
    generatingUsername,
    submit,
    generateUsername,
  } = useAuthForm(onClose);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
          <AuthMessage mode={mode} signupSent={signupSent} />
        )}
      </div>

      {mode !== "forgot" && <AuthToggle mode={mode as "signin" | "signup"} setMode={setMode} />}

      <AuthInputs
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        username={username}
        setUsername={setUsername}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        mode={mode}
        generateUsername={generateUsername}
        generating={generatingUsername}
        onForgotPassword={() => setMode("forgot")}
        emailWarning={emailWarning}
      />

      {mode === "forgot" && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            type="button"
            className="btn small dim"
            onClick={() => setMode("signin")}
            style={{ fontSize: 14 }}
          >
            Back to sign in
          </button>
        </div>
      )}

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

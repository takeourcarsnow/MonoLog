// AuthButton.tsx
interface AuthButtonProps {
  mode: "signin" | "signup";
  loading: boolean;
  hasError: boolean;
  hasSuccess: boolean;
  justSignedIn: boolean;
  signupSent: boolean;
  onSubmit: () => void;
}

export function AuthButton({ mode, loading, hasError, hasSuccess, justSignedIn, signupSent, onSubmit }: AuthButtonProps) {
  // Derive a single button state to simplify rendering and avoid mixed flags
  const buttonState: 'idle' | 'loading' | 'success' | 'error' | 'signup-sent' = (
    signupSent ? 'signup-sent' : (justSignedIn ? 'success' : (loading ? 'loading' : (hasError ? 'error' : 'idle')))
  );
  // Do not add a visual "error" class to the button on failure; keep error
  // state for inline messages/toasts but avoid turning the button red.
  const btnClass = `auth-confirm-btn ${loading ? 'loading' : ''} ${buttonState === 'signup-sent' || buttonState === 'success' ? 'sent' : ''} ${mode === 'signup' ? 'mode-signup' : 'mode-signin'}`;

  return (
    <div className="auth-actions flex gap-1 justify-center w-full" style={{ maxWidth: 400 }}>
      <button
        className={btnClass}
        disabled={loading}
        type="submit"
        onClick={onSubmit}
        aria-busy={loading}
        aria-live="polite"
        aria-label={mode === 'signup' ? (loading ? 'Creating account' : 'Create account') : (loading ? 'Signing in' : 'Sign in')}
      >
        <span className="btn-inner">
          {buttonState === 'signup-sent' && (
            <span className="btn-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          )}

          {buttonState === 'success' && (
            <span className="btn-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          )}

            {/* absolute-centered loader so button width doesn't change */}
            <span className="btn-loader-wrapper" aria-hidden>
              {buttonState === 'loading' && (
                <span className="btn-loading-dots" aria-hidden>
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              )}
            </span>

          <span
            className="btn-label"
            data-text={buttonState === 'success' ? 'Signed in' : (mode === 'signup' ? 'Create account' : 'Sign in')}
          >
            {buttonState === 'success' ? 'Signed in' : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </span>
        </span>
        {/* visible hint for screen readers during loading */}
        {loading && <span className="sr-only">{mode === 'signup' ? 'Creating account' : 'Signing in'}</span>}
      </button>
    </div>
  );
}
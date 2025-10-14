"use client";
// AuthInputs.tsx
import { useState, useEffect, useRef } from "react";
import { validUsername } from "./authUtils";
import { Dice6 } from "lucide-react";

interface AuthInputsProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  username: string;
  setUsername: (username: string) => void;
  mode: "signin" | "signup";
  generateUsername?: () => Promise<string | null>;
  generating?: boolean;
}

export function AuthInputs({ email, setEmail, password, setPassword, username, setUsername, mode, generateUsername, generating }: AuthInputsProps) {
  // validate against lowercased username (backend rules are lowercase); allow display capitalization
  const isUsernameValid = validUsername((username || "").toLowerCase());

  // local spinning state so the dice icon can finish its rotation after generating flips to false
  const [spinning, setSpinning] = useState(false);
  const spinTimeoutRef = useRef<number | null>(null);
  const [spinKey, setSpinKey] = useState(0);

  useEffect(() => {
    // when generation starts, begin spinning immediately
    if (generating) {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      // bump key so the icon remounts and restarts animation even if class already present
      setSpinKey(k => k + 1);
      setSpinning(true);
      return;
    }

    // when generation stops, allow the icon to animate a bit longer so it completes rotation
    if (!generating && spinning) {
      // keep spinning for another 600ms (one rotation + buffer)
      spinTimeoutRef.current = window.setTimeout(() => {
        setSpinning(false);
        spinTimeoutRef.current = null;
      }, 600);
    }

    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
    };
  }, [generating]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full flex flex-col gap-2 inputs-wrap" style={{ maxWidth: 400 }}>
      <div className="field-group flex flex-col gap-2 w-full">
        <input
          className="input fancy-input"
          placeholder="Email or username"
          value={email}
          name="email"
          autoComplete="email"
          inputMode="email"
          onChange={e => setEmail(e.target.value)}
          aria-label="Email or username"
          autoCorrect="off"
          autoCapitalize="none"
        />
        <input
          className="input fancy-input"
          placeholder="Password"
          type="password"
          value={password}
          name="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          onChange={e => setPassword(e.target.value)}
          aria-label="Password"
        />
        <div
          className={`username-wrap transition-all duration-300 ease-out ${mode === 'signup' ? 'open' : 'closed'}`}
          aria-hidden={mode !== 'signup'}
        >
          <div className="relative">
            <input
              className="input fancy-input pl-12"
              placeholder="Choose a username"
              value={username}
              name="username"
              autoComplete="username"
              onChange={e => setUsername(e.target.value)}
              aria-describedby="username-help"
              aria-invalid={username ? !isUsernameValid : undefined}
            />
            <div className="validity-indicator" aria-hidden>
              <svg
                className={`check ${isUsernameValid ? 'ok' : (username ? 'pending' : '')}`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Generate button in the username input */}
            <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)' }} aria-hidden={mode !== 'signup'}>
              {mode === 'signup' ? (
                <button
                  type="button"
                  className="btn small dim"
                  disabled={Boolean(generating)}
                  onClick={async () => {
                    if (!generateUsername) return;
                    try {
                      await generateUsername();
                    } catch (_) {
                      // ignore - parent will show header notice if needed
                    }
                  }}
                >
                  <Dice6 key={spinKey} size={16} className={spinning ? 'dice-spin' : ''} />
                </button>
              ) : null}
            </div>
          </div>
            <div id="username-help" className="dim help" aria-live="polite">
            3–32 chars: letters, numbers, &#39;-&#39; or &#39;_&#39;. (Displayed capitalization is allowed; the username will be matched case-insensitively.)
          </div>
        </div>
      </div>
    </div>
  );
}
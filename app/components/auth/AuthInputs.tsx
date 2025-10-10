// AuthInputs.tsx
import { validUsername } from "./authUtils";

interface AuthInputsProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  username: string;
  setUsername: (username: string) => void;
  mode: "signin" | "signup";
}

export function AuthInputs({ email, setEmail, password, setPassword, username, setUsername, mode }: AuthInputsProps) {
  const isUsernameValid = validUsername(username || "");

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
              className="input fancy-input pr-12"
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
          </div>
          <div id="username-help" className="dim help" aria-live="polite">
            3–32 chars: lowercase letters, numbers, &apos;-&apos; or &apos;_&apos;.
          </div>
        </div>
      </div>
    </div>
  );
}
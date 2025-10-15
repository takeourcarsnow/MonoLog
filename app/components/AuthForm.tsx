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

function isTempEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Common temporary/disposable email domains
  const tempDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'temp-mail.org', 'throwaway.email',
    'yopmail.com', 'maildrop.cc', 'tempail.com', 'dispostable.com', 'getnada.com',
    'mail-temporaire.fr', 'mytemp.email', 'temp-mail.io', 'tempmail.net', 'fakeinbox.com',
    'mailcatch.com', 'tempinbox.com', 'temp-mail.ru', '10minutemail.net', 'guerrillamail.net',
    'mailinator.net', 'temp-mail.org', 'throwaway.email', 'yopmail.fr', 'maildrop.cc',
    'tempail.com', 'dispostable.com', 'getnada.com', 'mail-temporaire.fr', 'mytemp.email',
    'temp-mail.io', 'tempmail.net', 'fakeinbox.com', 'mailcatch.com', 'tempinbox.com',
    'temp-mail.ru', '10minutemail.de', 'guerrillamail.de', 'mailinator.de', 'temp-mail.de',
    'throwaway.email', 'yopmail.de', 'maildrop.cc', 'tempail.de', 'dispostable.de',
    'getnada.de', 'mail-temporaire.de', 'mytemp.email', 'temp-mail.io', 'tempmail.de',
    'fakeinbox.de', 'mailcatch.de', 'tempinbox.de', 'temp-mail.ru', '10minutemail.co.uk',
    'guerrillamail.co.uk', 'mailinator.co.uk', 'temp-mail.co.uk', 'throwaway.email',
    'yopmail.co.uk', 'maildrop.cc', 'tempail.co.uk', 'dispostable.co.uk', 'getnada.co.uk',
    'mail-temporaire.co.uk', 'mytemp.email', 'temp-mail.io', 'tempmail.co.uk', 'fakeinbox.co.uk',
    'mailcatch.co.uk', 'tempinbox.co.uk', 'temp-mail.ru', '10minutemail.com.au', 'guerrillamail.com.au',
    'mailinator.com.au', 'temp-mail.com.au', 'throwaway.email', 'yopmail.com.au', 'maildrop.cc',
    'tempail.com.au', 'dispostable.com.au', 'getnada.com.au', 'mail-temporaire.com.au', 'mytemp.email',
    'temp-mail.io', 'tempmail.com.au', 'fakeinbox.com.au', 'mailcatch.com.au', 'tempinbox.com.au',
    'temp-mail.ru', '10minutemail.ca', 'guerrillamail.ca', 'mailinator.ca', 'temp-mail.ca',
    'throwaway.email', 'yopmail.ca', 'maildrop.cc', 'tempail.ca', 'dispostable.ca',
    'getnada.ca', 'mail-temporaire.ca', 'mytemp.email', 'temp-mail.io', 'tempmail.ca',
    'fakeinbox.ca', 'mailcatch.ca', 'tempinbox.ca', 'temp-mail.ru'
  ];
  
  return tempDomains.includes(domain);
}

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

  const [generatingUsername, setGeneratingUsername] = useState(false);

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
        if (isTempEmail(email)) {
          setLoading(false);
          showHeaderNotice({ title: 'Temporary emails not allowed', subtitle: 'Please use a permanent email address.', variant: 'warn' }, 4000);
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
        showHeaderNotice({ title: 'Next steps', subtitle: 'If approved, we\'ll email setup instructions.', variant: 'info' }, 4500);
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
        showHeaderNotice({ title: 'Next steps', subtitle: 'If approved, we\'ll email setup instructions.', variant: 'info' }, 4000);
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
  }, [email, password, username]);

  // Generate a random username and ensure it's available (retry a few times)
  async function generateUsername() {
    // Only allow during signup mode
    if (mode !== 'signup') return null;
    setGeneratingUsername(true);

    // Much larger word lists for high variety; avoid personal names
    const nicknames = [
      'sammy','remy','moss','momo','bex','rue','sly','lou','ani','kai','nico','taz','ricky','jaz','kit','mika','zuri','ely',
      'zen','vox','lynx','nova','echo','blitz','fizz','gizmo','haze','jinx','koda','luxe','maze','onyx','pika','quill','rune','saga','tide','ursa','vibe','wisp','xeno','yara','zest',
      'spry','mirth','bobo','puck','tiki','zelo','fawn','brio','coda','dax','emberly','fable','gale','halo','indo','juno','keta','lux','miso','nori','orbi','polo','quirk','riven','sable','tavi'
    ];

    const adjectives = [
      'blue','quiet','bold','little','golden','urban','frosty','sage','neon','retro','cosmic','rusty','silk','mellow','crimson','velvet','arctic',
      'tropical','pixel','atomic','fable','hyper','slick','honest','ember','luminous','brisk','sable','glassy','brave','spry','auric','plume','verdant','opal','sable','brisk','ripple','sonic'
    ];

    const nouns = [
      'fox','river','cloud','orbit','pixel','stream','ember','trail','anchor','haven','ripple','glint','spark','forge','quartz','atlas','cinder','delta','globe','harbor',
      'isle','jewel','kite','lumen','maze','nova','opal','peak','quill','ridge','spire','tide','umbra','vale','whirl','xyl','yew','zenith','bloom','cascade','dune','echo','fjord','grove','hollow','ink','jet','knoll','lagoon','marsh','nimbus'
    ];

    const separators = ['', '-', '_', '.'];
    const maxAttempts = 200; // increase attempts for more variety

    // helper to pick random element
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    // helper to produce a leetspeak-ish variant sometimes
    const maybeLeet = (s: string) => {
      if (Math.random() < 0.08) {
        return s.replace(/a/g, '4').replace(/e/g, '3').replace(/i/g, '1').replace(/o/g, '0').replace(/s/g, '5');
      }
      return s;
    };

    try {
      for (let i = 0; i < maxAttempts; i++) {
        const patternType = Math.random();
        let candidate = '';

        if (patternType < 0.12) {
          // single nickname + optional 2-digit suffix
          const nick = pick(nicknames);
          const useNum = Math.random() < 0.5;
          const num = useNum ? String(Math.floor(Math.random() * 90) + 10) : '';
          candidate = `${nick}${num}`;
        } else if (patternType < 0.28) {
          // adjective + noun or adjective.adj.noun (2-3 parts)
          const parts = [maybeLeet(pick(adjectives)), maybeLeet(pick(nouns))];
          if (Math.random() < 0.3) parts.splice(1, 0, maybeLeet(pick(adjectives)));
          const sep = pick(separators);
          candidate = parts.join(sep);
        } else if (patternType < 0.42) {
          // noun + noun (compound) with optional sep and optional number
          const n1 = maybeLeet(pick(nouns));
          let n2 = maybeLeet(pick(nouns));
          // avoid identical pair
          if (n1 === n2) n2 = maybeLeet(pick(nouns));
          const sep = pick(separators);
          const useNum = Math.random() < 0.25;
          const num = useNum ? String(Math.floor(Math.random() * 900) + 10) : '';
          candidate = `${n1}${sep}${n2}${num}`;
        } else if (patternType < 0.55) {
          // nickname + adjective or nickname-adj-noun
          const nick = maybeLeet(pick(nicknames));
          if (Math.random() < 0.5) {
            candidate = `${nick}${pick(separators)}${maybeLeet(pick(adjectives))}`;
          } else {
            candidate = `${nick}${pick(separators)}${maybeLeet(pick(adjectives))}${pick(separators)}${maybeLeet(pick(nouns))}`;
          }
        } else if (patternType < 0.7) {
          // random 2-4 word mash from mixed pools, joined by separator or camelCase
          const pool = [...nicknames, ...adjectives, ...nouns];
          const count = 2 + Math.floor(Math.random() * 3); // 2-4
          const parts: string[] = [];
          for (let j = 0; j < count; j++) {
            parts.push(maybeLeet(pick(pool)));
          }
          const sep = pick(separators);
          if (sep === '') {
            // sometimes use camelcase for visual variety
            candidate = parts.map((p, idx) => idx === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
          } else {
            candidate = parts.join(sep);
          }
        } else if (patternType < 0.85) {
          // adjective + number (3 digits) or noun + short number
          const a = maybeLeet(pick(adjectives));
          const n = maybeLeet(pick(nouns));
          if (Math.random() < 0.5) candidate = `${a}${String(Math.floor(Math.random() * 900) + 100)}`;
          else candidate = `${n}${String(Math.floor(Math.random() * 90) + 10)}`;
        } else {
          // more playful combos: adjective + adjective + noun or nickname + noun
          if (Math.random() < 0.5) {
            candidate = `${maybeLeet(pick(adjectives))}${pick(separators)}${maybeLeet(pick(adjectives))}${pick(separators)}${maybeLeet(pick(nouns))}`;
          } else {
            candidate = `${maybeLeet(pick(nicknames))}${pick(separators)}${maybeLeet(pick(nouns))}`;
          }
        }

  // normalize: collapse multiple separators, remove illegal chars, and lowercase for checks
  // allow dot in generation but replace with separator-friendly char if needed
  candidate = candidate.replace(/\.+/g, '-');
  candidate = candidate.replace(/[-_]{2,}/g, (m) => m.charAt(0));
  candidate = candidate.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        // collapse consecutive separators to a single instance
        candidate = candidate.replace(/[-_]{2,}/g, (m) => m.charAt(0));
        // strip leading/trailing separators
        candidate = candidate.replace(/^[-_]+|[-_]+$/g, '');

        // enforce length rules
        if (candidate.length < 3 || candidate.length > 32) continue;
        if (!validUsername(candidate)) continue;

        try {
          const ok = await checkUsernameAvailability(candidate);
          if (ok) {
            // create a friendlier display version with some capitalization
            let display = candidate;
            if (candidate.includes('-') || candidate.includes('_')) {
              display = candidate.split(/[-_]/).map(s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '').join(candidate.includes('-') ? '-' : '_');
            } else {
              display = candidate.charAt(0).toUpperCase() + candidate.slice(1);
            }

            setUsername(display);
            showHeaderNotice({ title: 'Generated username', subtitle: `Using “${display}”. You can change it before continuing.`, variant: 'info' }, 5000);
            return candidate;
          }
        } catch (e) {
          // availability check failed — try again next attempt
          continue;
        }
      }

      showHeaderNotice({ title: 'Could not generate', subtitle: 'I tried a few names — please try again or pick your own username.', variant: 'warn' }, 4500);
      return null;
    } finally {
      setGeneratingUsername(false);
    }
  }

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
        generateUsername={generateUsername}
        generating={generatingUsername}
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


"use client";

import React, { useEffect, useState } from 'react';
import { isInAppBrowser } from '@/src/lib/detectWebview';

type State = {
  error: Error | null;
  info: string | null;
  visibleStack: boolean;
};

const REPORT_ENDPOINT = '/api/debug/log';

function sendReport(payload: any) {
  try {
    // best-effort, do not block rendering
    fetch(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

export default class ClientErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { error: null, info: null, visibleStack: false };

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const payload = {
      type: 'react-error',
      message: error?.message,
      stack: (error && (error as any).stack) || null,
      info: info?.componentStack || null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ts: new Date().toISOString(),
    };
    // update UI
    this.setState({ error, info: info?.componentStack || null });
    // report to server
    sendReport(payload);
  }

  render() {
    if (this.state.error) {
      return (
        <ClientErrorUI
          error={this.state.error}
          info={this.state.info}
          visibleStack={this.state.visibleStack}
          onToggle={() => this.setState({ visibleStack: !this.state.visibleStack })}
        />
      );
    }

    return <ClientErrorHandlerWrapper>{this.props.children}</ClientErrorHandlerWrapper>;
  }
}

function ClientErrorUI({ error, info, visibleStack, onToggle }: { error: Error; info: string | null; visibleStack: boolean; onToggle: () => void }) {
  return (
    <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-lg mb-2">Application error: a client-side exception has occurred</h1>
      <p className="max-w-[640px] text-center opacity-80">This app encountered an unexpected error while running. The error has been captured and (optionally) reported to the server for debugging.</p>
      <div className="mt-4 flex gap-2">
        <button onClick={onToggle} className="px-3 py-2 bg-[var(--primary)] text-white rounded">Show details</button>
        <button onClick={() => {
          try { window.location.reload(); } catch (e) { }
        }} className="px-3 py-2 bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded">Reload</button>
        {isInAppBrowser() ? (
          <>
            <button onClick={() => {
              try {
                navigator.clipboard?.writeText(window.location.href);
                alert('Link copied — open in your browser.');
              } catch (e) { try { prompt('Copy link', window.location.href); } catch(_) {} }
            }} className="px-3 py-2 bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded">Copy link</button>
          </>
        ) : (
          <button onClick={() => {
            try { window.open(window.location.href, '_blank'); } catch (e) { }
          }} className="px-3 py-2 bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded">Open externally</button>
        )}
      </div>
      {visibleStack ? (
        <pre className="mt-4 whitespace-pre-wrap text-left max-w-[90%] overflow-x-auto bg-[var(--bg-elev)] p-3 rounded border border-[var(--border)] text-[var(--text)]">
          {error?.message}
          {info ? '\n\n' + info : ''}
          {error && (error as any).stack ? '\n\nStack:\n' + (error as any).stack : ''}
        </pre>
      ) : null}
    </div>
  );
}

// Wrapper component that installs global window error handlers and lifts errors
function ClientErrorHandlerWrapper({ children }: { children: React.ReactNode }) {
  const [caughtError, setCaughtError] = useState<Error | null>(null);

  useEffect(() => {
    let reported = false;

    const handleError = (ev: ErrorEvent) => {
      try {
        const payload = {
          type: 'window-error',
          message: ev.message,
          filename: ev.filename,
          lineno: ev.lineno,
          colno: ev.colno,
          stack: ev.error ? (ev.error.stack || null) : null,
          url: window.location.href,
          userAgent: navigator.userAgent,
          ts: new Date().toISOString(),
        };
        if (!reported) { sendReport(payload); reported = true; }
        // surface a minimal error to React tree by setting state
        setCaughtError(ev.error || new Error(ev.message));
      } catch (e) {
        // silent
      }
    };

    const handleRejection = (ev: PromiseRejectionEvent) => {
      try {
        const reason = ev.reason;
        const payload = {
          type: 'unhandledrejection',
          reason: typeof reason === 'object' ? JSON.stringify(reason, Object.getOwnPropertyNames(reason)) : String(reason),
          stack: reason && reason.stack ? reason.stack : null,
          url: window.location.href,
          userAgent: navigator.userAgent,
          ts: new Date().toISOString(),
        };
        if (!reported) { sendReport(payload); reported = true; }
        setCaughtError(reason instanceof Error ? reason : new Error(String(reason)));
      } catch (e) {
        // silent
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection as any);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection as any);
    };
  }, []);

  // if a global error was caught push into a simple visible fallback; we render
  // a minimal built-in UI here. For richer UI, the class-based boundary will
  // handle React render errors via componentDidCatch.
  if (caughtError) {
    return (
      <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <h1 className="text-lg mb-2">Application error: a client-side exception has occurred</h1>
        <pre className="mt-3 whitespace-pre-wrap max-w-[90%] overflow-x-auto bg-[var(--bg-elev)] p-3 rounded border border-[var(--border)] text-[var(--text)]">
          {caughtError?.message}
          {(caughtError as any)?.stack ? '\n\n' + (caughtError as any).stack : ''}
        </pre>
        <div className="mt-3">
          <button onClick={() => { try { window.location.reload(); } catch (e) {} }} className="px-3 py-2 bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded">Reload</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

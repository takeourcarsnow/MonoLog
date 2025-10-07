// Development helper: instrument focus calls and focusin events to find
// what is stealing focus. Import and call initFocusDebug() from the
// uploader when reproducing the bug (will be no-op in production).

export function initFocusDebug() {
  if (typeof window === 'undefined') return;
  // only enable in non-production to avoid instrumenting in prod
  if (process.env.NODE_ENV === 'production') return;
  // avoid double-installing
  if ((window as any).__monolog_focus_debug_installed) return;
  (window as any).__monolog_focus_debug_installed = true;

  try {
    const origFocus = (HTMLElement.prototype as any).focus as Function;
    (HTMLElement.prototype as any).focus = function (this: HTMLElement, ...args: any[]) {
      try {
        const el = this as HTMLElement;
        const time = new Date().toISOString();
        const info = {
          time,
          tag: el?.tagName,
          id: el?.id,
          class: el?.className,
          aria: el?.getAttribute ? el.getAttribute('aria-label') : null,
          tabindex: el?.getAttribute ? el.getAttribute('tabindex') : null,
          outerHTML: (() => { try { return el.outerHTML?.slice(0, 400); } catch (_) { return null; } })(),
        };
        const stack = (new Error().stack || '').split('\n').slice(0, 10).join('\n');
        // push to global array for later dump
        try {
          const g = (window as any).__monolog_focus_debug_log ||= [] as any[];
          g.push({ type: 'focus', info, stack });
        } catch (_) {}
        console.groupCollapsed(`[focusDebug] programmatic focus() -> <${info.tag}> id=${info.id} aria=${info.aria} @ ${time}`);
        console.log('element info:', info);
        console.log('stack:', stack);
        console.groupEnd();
      } catch (e) {
        try { console.warn('[focusDebug] error while logging focus', e); } catch (_) {}
      }
      return origFocus.apply(this, args as any);
    } as any;
  } catch (e) {
    try { console.warn('[focusDebug] failed to wrap Element.prototype.focus', e); } catch (_) {}
  }

  // Log focusin events (capture phase) so we can see when activeElement changes.
  document.addEventListener('focusin', (ev) => {
    try {
      const t = ev.target as HTMLElement | null;
      const info = {
        time: new Date().toISOString(),
        tag: t?.tagName,
        id: t?.id,
        class: t?.className,
        aria: t?.getAttribute ? t.getAttribute('aria-label') : null,
        tabIndex: t?.getAttribute ? t.getAttribute('tabindex') : null,
      };
      const stack = (new Error().stack || '').split('\n').slice(0, 10).join('\n');
      try { (window as any).__monolog_focus_debug_log ||= []; (window as any).__monolog_focus_debug_log.push({ type: 'focusin', info, stack }); } catch (_) {}
      console.groupCollapsed(`[focusDebug] focusin -> <${info.tag}> id=${info.id} aria=${info.aria} @ ${info.time}`);
      console.log('event target info:', info);
      console.log('document.activeElement:', document.activeElement);
      console.log('stack:', stack);
      console.groupEnd();
    } catch (e) {
      try { console.warn('[focusDebug] error in focusin handler', e); } catch (_) {}
    }
  }, true);

  // optional: correlate pointer/click events
  document.addEventListener('pointerdown', (ev) => {
    try {
      const t = ev.target as HTMLElement | null;
      const msg = t && (t.tagName + (t.id ? `#${t.id}` : '') + (t.getAttribute ? ` aria=${t.getAttribute('aria-label')}` : ''));
      try { (window as any).__monolog_focus_debug_log ||= []; (window as any).__monolog_focus_debug_log.push({ type: 'pointerdown', time: new Date().toISOString(), target: msg }); } catch (_) {}
      console.log('[focusDebug] pointerdown on', msg);
    } catch (_) {}
  }, true);

  document.addEventListener('click', (ev) => {
    try {
      const t = ev.target as HTMLElement | null;
      const msg = t && (t.tagName + (t.id ? `#${t.id}` : '') + (t.getAttribute ? ` aria=${t.getAttribute('aria-label')}` : ''));
      try { (window as any).__monolog_focus_debug_log ||= []; (window as any).__monolog_focus_debug_log.push({ type: 'click', time: new Date().toISOString(), target: msg }); } catch (_) {}
      console.log('[focusDebug] click on', msg);
    } catch (_) {}
  }, true);

  // Expose a convenient dump function to print collected logs
  (window as any).__monolog_focus_debug_dump = function () {
    const g = (window as any).__monolog_focus_debug_log || [];
    console.log('---- focusDebug dump (last 200 entries) ----');
    for (let i = Math.max(0, g.length - 200); i < g.length; i++) {
      const e = g[i];
      console.log(i, e);
    }
    console.log('---- end dump ----');
    return g;
  };
}

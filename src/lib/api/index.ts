import { CONFIG } from "../config";
import { localApi } from "./local";
import { supabaseApi, getSupabaseClientRaw } from "./supabase";
import type { Api } from "../types";

// Start with the adapter the bundle picked at build time.
let currentApi: Api = CONFIG.mode === "local" ? localApi : supabaseApi;

// re-export the raw client accessor under a stable name
export const getSupabaseClient = getSupabaseClientRaw;

// Development/runtime helper: if the client bundle thinks it's running in
// local mode but the server reports supabase (for example because .env.local
// was added after the client bundle was built or due to caching), perform a
// runtime check and switch to the supabase adapter so the UI can use the
// remote backend without needing a full rebuild.
// If the client bundle was built for `local` but the server is actually
// configured for Supabase, perform a runtime check and switch adapters.
// Important: create a promise so early API calls can wait for this decision
// and avoid using the empty `local` adapter before the override finishes.
let __runtimeInitResolve: any = null;
let __runtimeInitPromise: Promise<void> | null = new Promise<void>((res: () => void) => { __runtimeInitResolve = res; });

if (typeof window !== 'undefined' && CONFIG.mode === 'local') {
	(async () => {
		try {
			const resp = await fetch('/api/debug/env');
			if (!resp.ok) {
				// allow callers to proceed
				__runtimeInitResolve?.();
				__runtimeInitPromise = null;
				return;
			}
			const json = await resp.json();
			if (json?.nextPublicMode === 'supabase' || json?.hasNextPublicSupabaseUrl) {
				try {
					if (json.nextPublicSupabaseUrl || json.nextPublicSupabaseAnonKey) {
						(window as any).__MONOLOG_RUNTIME_SUPABASE__ = {
							url: json.nextPublicSupabaseUrl || null,
							anonKey: json.nextPublicSupabaseAnonKey || null,
						};
					}
				} catch (e) {}
				currentApi = supabaseApi;
				// eslint-disable-next-line no-console
				console.log('[api] runtime override -> supabase');
			}
		} catch (e) {
			// ignore network/debug failures
		} finally {
			// signal that runtime detection completed (success or failure)
			try { if (__runtimeInitResolve) __runtimeInitResolve(); } catch (e) {}
			__runtimeInitPromise = null;
		}
	})();
} else {
	// No runtime init needed; resolve immediately
	try { if (__runtimeInitResolve) __runtimeInitResolve(); } catch (e) {}
	__runtimeInitPromise = null;
}

// Export a thin proxy that forwards calls to the currently selected adapter.
// This keeps the public `api` shape stable while allowing runtime switching.
export const api: Api = new Proxy({} as Api, {
	get(_, prop: string) {
		const target = currentApi as any;
		const v = target?.[prop];
		if (typeof v === 'function') {
			return async (...args: any[]) => {
				// If runtime init is pending, wait for it before calling the real API
				if (__runtimeInitPromise) {
					try { await __runtimeInitPromise; } catch (e) { /* ignore */ }
				}
				return (target as any)[prop](...args);
			};
		}
		return v;
	},
	set(_, prop: string, value) {
		(currentApi as any)[prop] = value;
		return true;
	}
});

// Print which adapter the bundle initially chose (build-time info).
if (process.env.NODE_ENV !== 'production') {
	try {
		// eslint-disable-next-line no-console
		console.log('[api] selected mode ->', CONFIG.mode === 'local' ? 'local' : 'supabase');
	} catch (e) {}
}
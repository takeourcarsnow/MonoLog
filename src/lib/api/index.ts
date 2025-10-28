import { CONFIG } from "../config";
import { supabaseApi, getSupabaseClientRaw } from "./supabase";
import { logger } from "../logger";
import type { Api } from "../types";

// Start with the supabase adapter.
let currentApi: Api = supabaseApi;

// re-export the raw client accessor under a stable name
export const getSupabaseClient = getSupabaseClientRaw;

// Development/runtime helper: if the server is configured for Supabase,
// perform a runtime check and set the client config.
// Important: create a promise so early API calls can wait for this decision.
let __runtimeInitResolve: any = null;
let __runtimeInitPromise: Promise<void> | null = new Promise<void>((res: () => void) => { __runtimeInitResolve = res; });

if (typeof window !== 'undefined') {
	(async () => {
		try {
			const resp = await fetch('/api/debug/env?public=1');
			if (!resp.ok) {
				// allow callers to proceed
				__runtimeInitResolve?.();
				__runtimeInitPromise = null;
				return;
			}
			const json = await resp.json();
			if (json?.nextPublicSupabaseUrl || json?.nextPublicSupabaseAnonKey) {
				try {
					(window as any).__MONOLOG_RUNTIME_SUPABASE__ = {
						url: json.nextPublicSupabaseUrl || null,
						anonKey: json.nextPublicSupabaseAnonKey || null,
					};
				} catch (e) {}
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
// Development info logging removed per user request.

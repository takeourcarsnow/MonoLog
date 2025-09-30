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
if (typeof window !== 'undefined' && CONFIG.mode === 'local') {
	try {
		// fire-and-forget: try to learn what the server sees
		(async () => {
			try {
				const resp = await fetch('/api/debug/env');
				if (!resp.ok) return;
				const json = await resp.json();
				// If the server is configured for supabase and the client bundle was
				// built for local, switch the runtime adapter to supabase.
				if (json?.nextPublicMode === 'supabase' || json?.hasNextPublicSupabaseUrl) {
					// If the server provided public keys, stash them for runtime
					// initialization so client-side supabase can be created even
					// when the bundle's build-time NEXT_PUBLIC_* vars are missing.
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
			}
		})();
	} catch (e) {
		// swallow
	}
}

// Export a thin proxy that forwards calls to the currently selected adapter.
// This keeps the public `api` shape stable while allowing runtime switching.
export const api: Api = new Proxy({} as Api, {
	get(_, prop: string) {
		const target = currentApi as any;
		const v = target?.[prop];
		if (typeof v === 'function') {
			return (...args: any[]) => (target as any)[prop](...args);
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
import { CONFIG } from "../config";
import { localApi } from "./local";
import { supabaseApi, getSupabaseClientRaw } from "./supabase";
import type { Api } from "../types";

export const api: Api = CONFIG.mode === "local" ? localApi : supabaseApi;

// re-export the raw client accessor under a stable name
export const getSupabaseClient = getSupabaseClientRaw;

// Development helper: print which API adapter the client chose. This logs to the
// browser console (when running in dev) so you can confirm whether the client
// bundle picked up NEXT_PUBLIC_MODE correctly.
if (process.env.NODE_ENV !== 'production') {
	try {
		// eslint-disable-next-line no-console
		console.debug('[api] selected mode ->', CONFIG.mode === 'local' ? 'local' : 'supabase');
	} catch (e) {}
}
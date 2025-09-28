import { CONFIG } from "../config";
import { localApi } from "./local";
import { supabaseApi, getSupabaseClientRaw } from "./supabase";
import type { Api } from "../types";

export const api: Api = CONFIG.mode === "local" ? localApi : supabaseApi;

// re-export the raw client accessor under a stable name
export const getSupabaseClient = getSupabaseClientRaw;
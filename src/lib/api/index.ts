import { CONFIG } from "../config";
import { localApi } from "./local";
import { supabaseApi } from "./supabase";
import type { Api } from "../types";

export const api: Api = CONFIG.mode === "local" ? localApi : supabaseApi;
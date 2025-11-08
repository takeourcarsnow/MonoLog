import type { User } from "@/lib/types";
import { RESERVED_ROUTES } from "@/lib/types";
import {
  validateUsername,
  looksLikeTwitter,
  looksLikeInstagram,
  looksLikeSpotify,
  looksLikeFacebook,
  looksLikeWebsite,
  shouldPrefixAt,
  ensureAt,
  normalizeDisplayName,
  normalizeBio,
  normalizeSocialLinks
} from "@/lib/validation";
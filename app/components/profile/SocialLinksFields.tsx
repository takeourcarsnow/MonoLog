import { Twitter, Instagram, Facebook, Globe } from "lucide-react";
import { SpotifyIcon } from "../uploader/SpotifyIcon";
import { looksLikeTwitter, looksLikeInstagram, looksLikeSpotify, looksLikeFacebook, looksLikeWebsite, ensureAt } from "@/lib/validation";

interface SocialLinksFieldsProps {
  editTwitter: string;
  setEditTwitter: (value: string) => void;
  editInstagram: string;
  setEditInstagram: (value: string) => void;
  editSpotify: string;
  setEditSpotify: (value: string) => void;
  editFacebook: string;
  setEditFacebook: (value: string) => void;
  editWebsite: string;
  setEditWebsite: (value: string) => void;
}

export const SocialLinksFields = ({
  editTwitter,
  setEditTwitter,
  editInstagram,
  setEditInstagram,
  editSpotify,
  setEditSpotify,
  editFacebook,
  setEditFacebook,
  editWebsite,
  setEditWebsite,
}: SocialLinksFieldsProps) => {
  return (
    <div className="social-drawer" role="region">
      <div style={{ display: 'grid', gap: 8 }}>
        <label className="label-group">
          <div className="muted-label sr-only">Instagram</div>
          <div className="input-container">
            <input
              className="input"
              placeholder="Instagram"
              value={editInstagram}
              onChange={e => setEditInstagram(e.target.value)}
              onBlur={() => setEditInstagram(ensureAt(editInstagram))}
            />
            <Instagram size={16} className={`input-icon ${looksLikeInstagram(editInstagram) ? 'instagram-filled' : ''}`} />
          </div>
        </label>
        <label className="label-group">
          <div className="muted-label sr-only">Spotify</div>
          <div className="input-container">
            <input
              className="input"
              placeholder="Spotify"
              value={editSpotify}
              onChange={e => setEditSpotify(e.target.value)}
            />
            <SpotifyIcon size={16} className={`input-icon ${looksLikeSpotify(editSpotify) ? 'spotify-filled' : ''}`} />
          </div>
        </label>
        <label className="label-group">
          <div className="muted-label sr-only">Twitter</div>
          <div className="input-container">
            <input
              className="input"
              placeholder="Twitter"
              value={editTwitter}
              onChange={e => setEditTwitter(e.target.value)}
              onBlur={() => setEditTwitter(ensureAt(editTwitter))}
            />
            <Twitter size={16} className={`input-icon ${looksLikeTwitter(editTwitter) ? 'twitter-filled' : ''}`} />
          </div>
        </label>
        <label className="label-group">
          <div className="muted-label sr-only">Facebook</div>
          <div className="input-container">
            <input
              className="input"
              placeholder="Facebook"
              value={editFacebook}
              onChange={e => setEditFacebook(e.target.value)}
              onBlur={() => setEditFacebook(ensureAt(editFacebook))}
            />
            <Facebook size={16} className={`input-icon ${looksLikeFacebook(editFacebook) ? 'facebook-filled' : ''}`} />
          </div>
        </label>
        <label className="label-group">
          <div className="muted-label sr-only">Website</div>
          <div className="input-container">
            <input
              className="input"
              placeholder="Website"
              value={editWebsite}
              onChange={e => setEditWebsite(e.target.value)}
            />
            <Globe size={16} className={`input-icon ${looksLikeWebsite(editWebsite) ? 'website-filled' : ''}`} />
          </div>
        </label>
      </div>
    </div>
  );
};
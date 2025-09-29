"use client";

import { useEffect, useState } from "react";
import { Uploader } from "@/components/Uploader";
import { AuthForm } from "@/components/AuthForm";
import { api } from "@/lib/api";

export default function UploadPage() {
  const [me, setMe] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await api.getCurrentUser();
      if (!mounted) return;
      setMe(u);
    })();

    const onAuth = async () => {
      const u = await api.getCurrentUser();
      if (!mounted) return;
      setMe(u);
    };
    window.addEventListener("auth:changed", onAuth);
    return () => { mounted = false; window.removeEventListener("auth:changed", onAuth); };
  }, []);

  // while loading
  if (me === undefined) return <div className="view-fade">Loading…</div>;

  // not signed in -> show simple auth form
  if (!me) {
    return (
      <div className="view-fade" style={{ maxWidth: 520, margin: "24px auto" }}>
        <div style={{ marginBottom: 12 }}>
          <strong>Please sign in to post</strong>
          <div className="dim">You must be signed in to upload photos.</div>
        </div>
        <AuthForm onClose={async () => setMe(await api.getCurrentUser())} />
      </div>
    );
  }

  // signed in -> show uploader
  return <Uploader />;
}
"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthRequired } from "@/app/components/auth/AuthRequired";
import { UploaderCore } from "./UploaderCore";

export function UploaderAuthWrapper() {
  const { me, setMe } = useAuth();

  if (me === undefined) {
    return (
      <div className="view-fade">
        <div className="card skeleton" style={{ height: 200, maxWidth: 600, margin: '24px auto' }} />
      </div>
    );
  }

  if (!me) {
    return (
      <AuthRequired>
        <AuthForm onClose={async () => setMe(await api.getCurrentUser())} />
      </AuthRequired>
    );
  }

  return <UploaderCore />;
}
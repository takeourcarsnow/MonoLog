"use client";
import { ProfileView } from "@/app/components/ProfileView";

export default function ProfilePage() {
  // Render the client-side ProfileView which will show the AuthForm when
  // the viewer is not signed in. Avoid redirecting unauthenticated visitors
  // to the home page so /profile can be used as the sign-in landing.
  return (
    <main className="p-6">
      <ProfileView />
    </main>
  );
}

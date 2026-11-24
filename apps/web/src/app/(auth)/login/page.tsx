"use client";

import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/brand/lockup";
import { OrbBackground } from "@/components/brand/orb-background";
import { getBrowserSupabase } from "@/lib/supabase/client";

// Messages for the ?error= codes set by /api/auth/callback.
function errorMessage(code: string | string[] | undefined): string | null {
  if (code === "auth_failed") return "Sign-in did not complete. Please try again.";
  return null;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string | string[] };
}) {
  const supabase = getBrowserSupabase();
  const error = errorMessage(searchParams?.error);

  async function signIn(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Lockup logoSize={56} wordSize={40} gap={16} />
        </div>
        <p className="text-sm text-muted-foreground">
          AI drafts every piece of an application. You review and ship.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="space-y-3">
          <Button variant="gradient" className="w-full" onClick={() => signIn("google")}>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={() => signIn("github")}>
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/brand/lockup";
import { OrbBackground } from "@/components/brand/orb-background";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getBrowserSupabase();

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

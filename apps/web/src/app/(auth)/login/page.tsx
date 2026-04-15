"use client";

import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  async function signIn(provider: "google" | "github") {
    const supabase = getBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">JobCopilot</h1>
        <p className="text-sm text-muted-foreground">AI-assisted job applications.</p>
      </div>
      <div className="space-y-3">
        <Button className="w-full" onClick={() => signIn("google")}>
          Continue with Google
        </Button>
        <Button className="w-full" variant="outline" onClick={() => signIn("github")}>
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
}

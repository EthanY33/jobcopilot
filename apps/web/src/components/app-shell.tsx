"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, KanbanSquare, User, Files, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Lockup } from "@/components/brand/lockup";
import { OrbBackground } from "@/components/brand/orb-background";
import { ThemeToggle } from "@/components/brand/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/variants", label: "Resume Variants", icon: Files },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = getBrowserSupabase();
  return (
    <div className="relative flex min-h-screen">
      <OrbBackground />
      <aside className="relative z-10 w-60 shrink-0 border-r border-border bg-card/60 backdrop-blur-sm p-4 flex flex-col">
        <div className="mb-6 px-2">
          <Lockup logoSize={26} wordSize={17} />
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent/15 text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1">
          <ThemeToggle className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="relative z-10 flex-1 p-8">{children}</main>
    </div>
  );
}

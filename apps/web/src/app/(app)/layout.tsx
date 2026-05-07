import { AppShell } from "@/components/app-shell";
import { PageTransition } from "@/components/brand/page-transition";
import { QueryProvider } from "@/lib/query-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppShell>
        <PageTransition>{children}</PageTransition>
      </AppShell>
    </QueryProvider>
  );
}

import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/lib/query-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}

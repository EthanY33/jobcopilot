import { prisma } from "@jobcopilot/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [total, applied, interviewing, offer] = await Promise.all([
    prisma.application.count({ where: { userId: data.user.id } }),
    prisma.application.count({ where: { userId: data.user.id, status: "applied" } }),
    prisma.application.count({
      where: { userId: data.user.id, status: { in: ["phone_screen", "onsite"] } },
    }),
    prisma.application.count({ where: { userId: data.user.id, status: "offer" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total" value={total} />
        <Stat label="Applied" value={applied} />
        <Stat label="Interviewing" value={interviewing} />
        <Stat label="Offers" value={offer} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

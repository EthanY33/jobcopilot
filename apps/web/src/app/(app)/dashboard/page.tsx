import { prisma } from "@jobcopilot/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/brand/animated-number";

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

  const inProgress = applied + interviewing;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {total} {total === 1 ? "application" : "applications"}
        {" · "}
        <span className="text-muted-foreground">{inProgress} in progress</span>
      </h1>
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
    <Card>
      <CardContent className="p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 font-mono text-3xl font-semibold tabular-nums">
          <AnimatedNumber value={value} flagKey="jobcopilot:dashboard_seen" />
        </div>
      </CardContent>
    </Card>
  );
}

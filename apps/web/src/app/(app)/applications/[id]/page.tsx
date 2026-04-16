import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { notFound, redirect } from "next/navigation";
import { ApplicationDetailTabs } from "@/components/application-detail-tabs";

export default async function ApplicationPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const app = await prisma.application.findFirst({
    where: { id: params.id, userId: data.user.id },
    include: {
      jobPosting: true,
      resumeVariant: true,
      drafts: { orderBy: [{ kind: "asc" }, { version: "desc" }] },
    },
  });
  if (!app) notFound();

  const variants = await prisma.resumeVariant.findMany({
    where: { userId: data.user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">{app.jobPosting.company}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{app.jobPosting.title}</h1>
        {app.jobPosting.location && (
          <div className="mt-1 text-sm text-muted-foreground">{app.jobPosting.location}</div>
        )}
      </div>
      <ApplicationDetailTabs
        application={JSON.parse(JSON.stringify(app))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}

import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { notFound, redirect } from "next/navigation";
import { ApplicationDetailTabs } from "@/components/application-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import type { ApplicationStatus } from "@jobcopilot/shared";

const STATUS_BADGE: Record<ApplicationStatus, "default" | "success" | "destructive" | "secondary"> = {
  wishlist: "secondary",
  applied: "default",
  phone_screen: "default",
  onsite: "default",
  offer: "success",
  rejected: "destructive",
  ghosted: "destructive",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  phone_screen: "Phone screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

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

  const status = app.status as ApplicationStatus;

  return (
    <div className="space-y-6">
      <header className="mb-6 space-y-2">
        <p className="font-sans text-sm text-muted-foreground/70">
          {app.jobPosting.company}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {app.jobPosting.title}
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[status]}>
            {STATUS_LABEL[status]}
          </Badge>
          {app.jobPosting.sourceUrl ? (
            <a
              href={app.jobPosting.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Job posting <ArrowUpRight className="size-3" />
            </a>
          ) : null}
        </div>
      </header>
      <ApplicationDetailTabs
        application={JSON.parse(JSON.stringify(app))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}

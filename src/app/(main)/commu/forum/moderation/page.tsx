import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getOpenForumReports } from "@/lib/actions/forum";
import { ModerationView } from "@/components/forum/moderation-view";

export async function generateMetadata() {
  const t = await getTranslations("meta.forumModeration");
  return { title: t("title") };
}

/** Les signalements du forum, pour l'equipe. */
export default async function ForumModerationPage() {
  if (!(await getMyStaffRole())) notFound();
  const reports = await getOpenForumReports();
  return <ModerationView initialReports={reports} />;
}

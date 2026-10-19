import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  getMyStaffRole,
  getPendingStaffApplications,
  getStaffMembers,
} from "@/lib/actions/staff";
import { AdminView } from "@/components/admin/admin-view";

export async function generateMetadata() {
  const t = await getTranslations("meta.admin");
  return { title: t("title") };
}

export default async function AdminPage() {
  const [user, role] = await Promise.all([getAuthenticatedUser(), getMyStaffRole()]);
  // Un 404 plutot qu'un refus : la page n'existe pas pour les autres.
  if (!user || role !== "admin") notFound();

  const t = await getTranslations("staff.admin");
  const [applications, members] = await Promise.all([
    getPendingStaffApplications(),
    getStaffMembers(),
  ]);

  return (
    <>
      <h1 className="mb-5 text-2xl font-bold">{t("title")}</h1>
      <AdminView applications={applications} members={members} myId={user.id} />
    </>
  );
}

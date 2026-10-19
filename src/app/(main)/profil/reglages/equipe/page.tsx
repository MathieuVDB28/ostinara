import { getTranslations } from "next-intl/server";
import { getMyStaffApplication, getMyStaffRole } from "@/lib/actions/staff";
import { StaffApply } from "@/components/admin/staff-apply";

export async function generateMetadata() {
  const t = await getTranslations("meta.staffApply");
  return { title: t("title") };
}

export default async function StaffApplyPage() {
  const [role, application] = await Promise.all([getMyStaffRole(), getMyStaffApplication()]);
  return <StaffApply role={role} application={application} />;
}

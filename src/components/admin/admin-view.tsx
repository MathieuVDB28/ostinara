"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { profileHref } from "@/lib/navigation";
import { instrumentLabel, sortInstruments } from "@/lib/instruments";
import { reviewStaffApplication, setStaffRole } from "@/lib/actions/staff";
import type { StaffApplication, StaffMember, StaffRole } from "@/types";

interface Props {
  applications: StaffApplication[];
  members: StaffMember[];
  myId: string;
}

const sectionTitle =
  "mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const smallButton =
  "inline-flex min-h-[36px] items-center rounded-full border border-border px-3 text-xs font-bold transition-colors hover:bg-accent disabled:opacity-50";

function Avatar({ url }: { url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="h-10 w-10 shrink-0 rounded-full bg-muted" />
  );
}

/**
 * L'administration de l'equipe editoriale : les demandes a examiner, puis
 * l'equipe en place. Reservee aux admins (la page renvoie un 404 aux
 * autres, et la base refuse de toute facon).
 */
export function AdminView({ applications, members, myId }: Props) {
  const t = useTranslations("staff.admin");
  const te = useTranslations("enums");
  const format = useFormatter();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) setError(result.error ?? null);
      else router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-7">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section>
        <h2 className={sectionTitle}>
          {t("applications", { count: applications.length })}
        </h2>
        {applications.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">{t("noApplications")}</p>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {applications.map((application) => {
              const user = application.user;
              const instruments = sortInstruments(user?.instruments ?? []);
              return (
                <li key={application.id} className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar url={user?.avatar_url} />
                    <div className="min-w-0 flex-1">
                      {user ? (
                        <Link href={profileHref(user.username)} className="block truncate text-sm font-semibold hover:underline">
                          {user.display_name || user.username}
                        </Link>
                      ) : null}
                      <span className="block truncate text-xs text-muted-foreground">
                        {[
                          instruments.map((entry) => instrumentLabel(entry, te)).join(" · "),
                          format.relativeTime(new Date(application.created_at)),
                        ]
                          .filter(Boolean)
                          .join(" — ")}
                      </span>
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-sm">{application.motivation}</p>
                  {application.links && (
                    <p className="break-words text-xs text-muted-foreground">{application.links}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => reviewStaffApplication(application.id, true))}
                      className="inline-flex min-h-[36px] items-center rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {t("accept")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => reviewStaffApplication(application.id, false))}
                      className={smallButton}
                    >
                      {t("decline")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className={sectionTitle}>{t("team", { count: members.length })}</h2>
        <ul className="divide-y divide-border border-b border-border">
          {members.map((member) => {
            const isMe = member.id === myId;
            const other: StaffRole = member.staff_role === "admin" ? "editor" : "admin";
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar url={member.avatar_url} />
                <div className="min-w-0 flex-1">
                  <Link href={profileHref(member.username)} className="block truncate text-sm font-semibold hover:underline">
                    {member.display_name || member.username}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {t(`role.${member.staff_role}`)}
                  </span>
                </div>
                {!isMe && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => setStaffRole(member.id, other))}
                      className={smallButton}
                    >
                      {t(other === "admin" ? "makeAdmin" : "makeEditor")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => setStaffRole(member.id, null))}
                      className={`${smallButton} text-destructive`}
                    >
                      {t("remove")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

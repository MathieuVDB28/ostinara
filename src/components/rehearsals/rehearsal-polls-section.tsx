"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  closeRehearsalPoll,
  deleteRehearsalPoll,
  voteRehearsalPoll,
} from "@/lib/actions/rehearsal-polls";
import type {
  BandMemberWithProfile,
  RehearsalPoll,
  RehearsalPollAnswer,
  RehearsalPollOption,
} from "@/types";

const ANSWERS: RehearsalPollAnswer[] = ["yes", "maybe", "no"];
const ANSWER_ACTIVE: Record<RehearsalPollAnswer, string> = {
  yes: "bg-success text-background",
  maybe: "bg-foreground text-background",
  no: "bg-destructive text-background",
};
const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

/** Le creneau qui a le plus de oui, puis de si besoin ; a egalite, le plus tot. */
function bestOptionId(options: RehearsalPollOption[], now: number): string | null {
  let best: { id: string; yes: number; maybe: number } | null = null;
  for (const option of options) {
    if (new Date(option.starts_at).getTime() <= now) continue;
    const yes = option.votes.filter((vote) => vote.answer === "yes").length;
    const maybe = option.votes.filter((vote) => vote.answer === "maybe").length;
    if (yes === 0 && maybe === 0) continue;
    if (!best || yes > best.yes || (yes === best.yes && maybe > best.maybe)) {
      best = { id: option.id, yes, maybe };
    }
  }
  return best?.id ?? null;
}

interface RehearsalPollsSectionProps {
  polls: RehearsalPoll[];
  members: BandMemberWithProfile[];
  currentUserId: string;
  isAdmin: boolean;
  readOnly: boolean;
}

export function RehearsalPollsSection({
  polls: initialPolls,
  members,
  currentUserId,
  isAdmin,
  readOnly,
}: RehearsalPollsSectionProps) {
  const t = useTranslations("rehearsals.poll");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const [polls, setPolls] = useState(initialPolls);
  const [lastInitial, setLastInitial] = useState(initialPolls);
  if (initialPolls !== lastInitial) {
    setLastInitial(initialPolls);
    setPolls(initialPolls);
  }
  const [confirming, setConfirming] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  // Fige au premier rendu : « passe » ne change pas pendant qu'on regarde.
  const [now] = useState(() => Date.now());

  if (polls.length === 0) return null;

  const nameOf = (userId: string | null) => {
    if (!userId) return "";
    if (userId === currentUserId) return t("you");
    const profile = members.find((member) => member.user_id === userId)?.profile;
    return profile?.display_name || profile?.username || "";
  };

  const slotLabel = (option: RehearsalPollOption) => {
    const start = new Date(option.starts_at);
    const day = start.toLocaleDateString(intlLocale, { weekday: "long", day: "numeric", month: "long" });
    const time = (date: Date) => date.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });
    return option.ends_at ? `${day} · ${time(start)}–${time(new Date(option.ends_at))}` : `${day} · ${time(start)}`;
  };

  const setError = (pollId: string, message: string | null) =>
    setErrors((current) => {
      const next = { ...current };
      if (message) next[pollId] = message;
      else delete next[pollId];
      return next;
    });

  const vote = (poll: RehearsalPoll, option: RehearsalPollOption, answer: RehearsalPollAnswer) => {
    const mine = option.votes.find((v) => v.user_id === currentUserId)?.answer;
    // Retoucher sa reponse l'enleve.
    const next = mine === answer ? null : answer;
    const previous = polls;
    setPolls((current) =>
      current.map((p) =>
        p.id !== poll.id
          ? p
          : {
              ...p,
              options: p.options.map((o) =>
                o.id !== option.id
                  ? o
                  : {
                      ...o,
                      votes: [
                        ...o.votes.filter((v) => v.user_id !== currentUserId),
                        ...(next ? [{ user_id: currentUserId, answer: next }] : []),
                      ],
                    }
              ),
            }
      )
    );
    setError(poll.id, null);
    startTransition(async () => {
      const result = await voteRehearsalPoll(option.id, next);
      if (!result.success) {
        setPolls(previous);
        setError(poll.id, result.error ?? tc("genericError"));
      }
    });
  };

  const validate = (poll: RehearsalPoll, option: RehearsalPollOption) => {
    setError(poll.id, null);
    startTransition(async () => {
      const result = await closeRehearsalPoll(poll.id, option.id);
      if (!result.success || !result.rehearsalId) {
        setError(poll.id, result.error ?? tc("genericError"));
        return;
      }
      router.push(`/setlists/rehearsals/${result.rehearsalId}`);
    });
  };

  const remove = (poll: RehearsalPoll) => {
    setError(poll.id, null);
    startTransition(async () => {
      const result = await deleteRehearsalPoll(poll.id);
      if (!result.success) {
        setError(poll.id, result.error ?? tc("genericError"));
        return;
      }
      setPolls((current) => current.filter((p) => p.id !== poll.id));
      setConfirming(null);
      router.refresh();
    });
  };

  return (
    <section aria-labelledby="rehearsal-polls">
      <h2 id="rehearsal-polls" className={`border-b border-border pb-2 ${SECTION_TITLE}`}>
        {t("sectionTitle")}
        <span className="tabular"> · {polls.length}</span>
      </h2>

      {readOnly && <p className="pt-3 text-sm text-muted-foreground">{t("readOnly")}</p>}

      {polls.map((poll) => {
        const canManage = !readOnly && (poll.created_by === currentUserId || isAdmin);
        const best = bestOptionId(poll.options, now);
        const allPast = poll.options.every((option) => new Date(option.starts_at).getTime() <= now);
        const answered = new Set(poll.options.flatMap((option) => option.votes.map((v) => v.user_id)));
        const waiting = members.filter((member) => !answered.has(member.user_id)).map((member) => nameOf(member.user_id));

        return (
          <article key={poll.id} id={`poll-${poll.id}`} className="scroll-mt-20 border-b border-border py-4">
            <h3 className="font-semibold">{poll.title}</h3>
            <p className="text-xs text-muted-foreground">
              {t("by", { name: nameOf(poll.created_by) })}
              {poll.location && ` · ${poll.location}`}
            </p>

            {allPast && <p className="mt-2 text-sm text-muted-foreground">{t("allPast")}</p>}

            <ul className="mt-3 space-y-3">
              {poll.options.map((option) => {
                const past = new Date(option.starts_at).getTime() <= now;
                const mine = option.votes.find((v) => v.user_id === currentUserId)?.answer;
                const by = (answer: RehearsalPollAnswer) =>
                  option.votes.filter((v) => v.answer === answer).map((v) => nameOf(v.user_id));
                const label = slotLabel(option);
                const confirmKey = `${poll.id}:${option.id}`;

                return (
                  <li
                    key={option.id}
                    className={`rounded-lg border p-3 ${best === option.id ? "border-success" : "border-border"} ${past ? "opacity-60" : ""}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold first-letter:uppercase">{label}</span>
                      {past ? (
                        <span className="text-xs text-muted-foreground">{t("past")}</span>
                      ) : best === option.id ? (
                        <span className="text-xs font-semibold text-success">{t("best")}</span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 tabular text-xs text-muted-foreground">
                      {t("counts", { yes: by("yes").length, maybe: by("maybe").length, no: by("no").length })}
                    </p>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {by("yes").length > 0 && <p>{t("whoYes", { names: by("yes").join(", ") })}</p>}
                      {by("maybe").length > 0 && <p>{t("whoMaybe", { names: by("maybe").join(", ") })}</p>}
                      {by("no").length > 0 && <p>{t("whoNo", { names: by("no").join(", ") })}</p>}
                    </div>

                    {!readOnly && !past && (
                      <div role="group" aria-label={t("yourAnswer", { date: label })} className="mt-2 grid grid-cols-3 gap-2">
                        {ANSWERS.map((answer) => (
                          <button
                            key={answer}
                            type="button"
                            aria-pressed={mine === answer}
                            onClick={() => vote(poll, option, answer)}
                            className={`min-h-[44px] rounded-md px-2 text-xs font-semibold transition-colors ${
                              mine === answer ? ANSWER_ACTIVE[answer] : "bg-secondary hover:bg-muted"
                            }`}
                          >
                            {t(`answers.${answer}`)}
                          </button>
                        ))}
                      </div>
                    )}

                    {canManage && !past && (
                      confirming === confirmKey ? (
                        <div className="mt-2 rounded-md bg-secondary p-3">
                          <p className="text-sm">{t("validateText", { date: label })}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => validate(poll, option)}
                              className="min-h-[44px] flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                            >
                              {t("validateConfirm")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="min-h-[44px] flex-1 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent"
                            >
                              {tc("cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(confirmKey)}
                          className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-2"
                        >
                          {t("validate")}
                        </button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>

            {waiting.length > 0 && !allPast && (
              <p className="mt-3 text-xs text-muted-foreground">{t("waiting", { names: waiting.join(", ") })}</p>
            )}

            {errors[poll.id] && (
              <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{errors[poll.id]}</p>
            )}

            {canManage && (
              confirming === `${poll.id}:delete` ? (
                <div className="mt-3 rounded-md bg-secondary p-3">
                  <p className="text-sm">{t("deleteText")}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(poll)}
                      className="min-h-[44px] flex-1 rounded-lg bg-destructive px-3 text-sm font-semibold text-background disabled:opacity-50"
                    >
                      {t("deleteConfirm")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="min-h-[44px] flex-1 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent"
                    >
                      {tc("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(`${poll.id}:delete`)}
                  className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-destructive"
                >
                  {t("delete")}
                </button>
              )
            )}
          </article>
        );
      })}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRehearsalTaskDone } from "@/lib/actions/rehearsal-logs";
import type { RehearsalTask } from "@/types";

interface RehearsalTaskListProps {
  tasks: RehearsalTask[];
  currentUserId: string;
  readOnly?: boolean;
}

/** Ce qu'il reste a bosser, a cocher par n'importe quel membre du groupe. */
export function RehearsalTaskList({ tasks, currentUserId, readOnly = false }: RehearsalTaskListProps) {
  const t = useTranslations("rehearsals.tasks");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // La coche repond tout de suite ; la liste suit au prochain rendu serveur.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isDone = (task: RehearsalTask) => overrides[task.id] ?? Boolean(task.done_at);

  const toggle = async (task: RehearsalTask) => {
    const done = !isDone(task);
    setPendingId(task.id);
    setFailed(false);
    setOverrides((current) => ({ ...current, [task.id]: done }));
    const result = await setRehearsalTaskDone(task.id, done);
    setPendingId(null);
    if (result.success) {
      router.refresh();
    } else {
      setOverrides((current) => ({ ...current, [task.id]: !done }));
      setFailed(true);
    }
  };

  return (
    <>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="border-b border-border">
            <label className="flex min-h-[48px] items-start gap-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={isDone(task)}
                disabled={readOnly || pendingId === task.id}
                onChange={() => toggle(task)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className={isDone(task) ? "text-muted-foreground line-through" : "font-medium"}>
                  {task.content}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {task.assignee_id === currentUserId
                    ? t("forMe")
                    : task.assignee?.display_name || task.assignee?.username || t("forEveryone")}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {t("failed")}
        </p>
      )}
    </>
  );
}

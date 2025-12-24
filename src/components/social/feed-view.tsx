"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActivityCard } from "./activity-card";
import type { ActivityWithDetails } from "@/types";

interface FeedViewProps {
  initialActivities: ActivityWithDetails[];
}

export function FeedView({ initialActivities }: FeedViewProps) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Feed</h1>
        <p className="mt-1 text-muted-foreground">
          Activite recente de tes amis
        </p>
      </div>

      {/* Activities list */}
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucune activite</h3>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            Ajoute des amis pour voir leur activite dans ton feed
          </p>
          <button
            onClick={() => router.push("/friends")}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
          >
            Trouver des amis
          </button>
        </div>
      )}
    </div>
  );
}

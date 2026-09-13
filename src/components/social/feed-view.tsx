"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActivityCard } from "./activity-card";
import type { ActivityWithDetails } from "@/types";

interface FeedViewProps {
  initialActivities: ActivityWithDetails[];
  currentUserId: string;
}

export function FeedView({ initialActivities, currentUserId }: FeedViewProps) {
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
          Activité récente de tes amis
        </p>
      </div>

      {/* Activities list */}
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} currentUserId={currentUserId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-3xl">feed</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucune activité</h3>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            Ajoute des amis pour voir leur activité dans ton feed
          </p>
          <button
            onClick={() => router.push("/commu/amis")}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
          >
            Trouver des amis
          </button>
        </div>
      )}
    </div>
  );
}

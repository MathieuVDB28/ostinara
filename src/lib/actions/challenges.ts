"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import { sendPushNotification } from "@/lib/notifications";
import type {
  Challenge,
  ChallengeWithDetails,
  ChallengeProgress,
  CreateChallengeInput,
  LeaderboardEntry,
  LeaderboardPeriod,
  Profile,
  Song,
} from "@/types";

// === Helper: Vérifier que deux utilisateurs sont amis ===
async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`
    )
    .single();

  return !!data;
}

// === Helper: Récupérer le nom d'affichage d'un utilisateur ===
async function getUserDisplayName(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .single();

  return profile?.display_name || profile?.username || "Un ami";
}

// === Créer un challenge ===
export async function createChallenge(
  input: CreateChallengeInput
): Promise<{ success: boolean; error?: string; challenge?: Challenge }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  if (user.id === input.challenger_id) {
    return { success: false, error: "Tu ne peux pas te défier toi-même" };
  }

  // Vérifier que les utilisateurs sont amis
  const friends = await areFriends(user.id, input.challenger_id);
  if (!friends) {
    return { success: false, error: "Tu dois être ami avec cette personne pour la défier" };
  }

  // Vérifier qu'il n'y a pas de challenge actif entre ces deux utilisateurs
  const { data: existingChallenge } = await supabase
    .from("challenges")
    .select("id")
    .in("status", ["pending", "active"])
    .or(
      `and(creator_id.eq.${user.id},challenger_id.eq.${input.challenger_id}),and(creator_id.eq.${input.challenger_id},challenger_id.eq.${user.id})`
    )
    .single();

  if (existingChallenge) {
    return { success: false, error: "Un défi est déjà en cours avec cette personne" };
  }

  // Préparer les données du challenge
  let songTitle: string | null = null;
  let songArtist: string | null = null;
  let songCoverUrl: string | null = null;

  // Pour les challenges de maîtrise, récupérer les infos du morceau
  if (input.challenge_type === "song_mastery") {
    if (!input.song_id) {
      return { success: false, error: "Un morceau est requis pour ce type de défi" };
    }

    const { data: song } = await supabase
      .from("songs")
      .select("title, artist, cover_url")
      .eq("id", input.song_id)
      .single();

    if (!song) {
      return { success: false, error: "Morceau non trouvé" };
    }

    songTitle = song.title;
    songArtist = song.artist;
    songCoverUrl = song.cover_url;
  }

  // Créer le challenge
  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      creator_id: user.id,
      challenger_id: input.challenger_id,
      challenge_type: input.challenge_type,
      duration_days: input.duration_days,
      song_id: input.song_id || null,
      song_title: songTitle,
      song_artist: songArtist,
      song_cover_url: songCoverUrl,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating challenge:", error);
    return { success: false, error: "Erreur lors de la création du défi" };
  }

  // Créer les records de progression pour les deux participants
  const progressRecords = [
    { challenge_id: challenge.id, user_id: user.id },
    { challenge_id: challenge.id, user_id: input.challenger_id },
  ];

  const { error: progressError } = await supabase
    .from("challenge_progress")
    .insert(progressRecords);

  if (progressError) {
    console.error("Error creating challenge progress:", progressError);
    // Supprimer le challenge si la création des progress échoue
    await supabase.from("challenges").delete().eq("id", challenge.id);
    return { success: false, error: "Erreur lors de la création du défi" };
  }

  // Envoyer une notification au challenger
  const creatorName = await getUserDisplayName(user.id);
  const challengeTypeLabels = {
    practice_time: "temps de pratique",
    streak: "streak de jours",
    song_mastery: `maîtrise de "${songTitle}"`,
  };

  await sendPushNotification(
    input.challenger_id,
    {
      title: "Nouveau défi !",
      body: `${creatorName} te lance un défi de ${challengeTypeLabels[input.challenge_type]} !`,
      data: { url: "/challenges" },
    },
    "challenge_created"
  );

  revalidatePath("/challenges");
  return { success: true, challenge: challenge as Challenge };
}

// === Accepter un challenge ===
export async function acceptChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier que le challenge existe et est adressé à l'utilisateur
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*, creator:profiles!challenges_creator_id_fkey(username, display_name)")
    .eq("id", challengeId)
    .eq("challenger_id", user.id)
    .eq("status", "pending")
    .single();

  if (!challenge) {
    return { success: false, error: "Défi non trouvé" };
  }

  // Calculer les dates de début et fin
  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + challenge.duration_days);

  // Mettre à jour le statut
  const { error } = await supabase
    .from("challenges")
    .update({
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq("id", challengeId);

  if (error) {
    console.error("Error accepting challenge:", error);
    return { success: false, error: "Erreur lors de l'acceptation" };
  }

  // Créer une activité
  const creatorProfile = challenge.creator as Profile;
  await createActivity({
    type: "challenge_accepted",
    reference_id: challengeId,
    metadata: {
      challenge_type: challenge.challenge_type,
      opponent_name: creatorProfile.display_name || creatorProfile.username,
    },
  });

  // Notifier le créateur
  const accepterName = await getUserDisplayName(user.id);
  await sendPushNotification(
    challenge.creator_id,
    {
      title: "Défi accepté !",
      body: `${accepterName} a accepté ton défi. C'est parti !`,
      data: { url: "/challenges" },
    },
    "challenge_accepted"
  );

  revalidatePath("/challenges");
  revalidatePath("/feed");
  return { success: true };
}

// === Décliner un challenge ===
export async function declineChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier que le challenge existe et est adressé à l'utilisateur
  const { data: challenge } = await supabase
    .from("challenges")
    .select("creator_id")
    .eq("id", challengeId)
    .eq("challenger_id", user.id)
    .eq("status", "pending")
    .single();

  if (!challenge) {
    return { success: false, error: "Défi non trouvé" };
  }

  // Mettre à jour le statut
  const { error } = await supabase
    .from("challenges")
    .update({ status: "declined" })
    .eq("id", challengeId);

  if (error) {
    console.error("Error declining challenge:", error);
    return { success: false, error: "Erreur lors du refus" };
  }

  // Notifier le créateur
  const declinerName = await getUserDisplayName(user.id);
  await sendPushNotification(
    challenge.creator_id,
    {
      title: "Défi refusé",
      body: `${declinerName} a refusé ton défi`,
      data: { url: "/challenges" },
    },
    "challenge_created" // Utiliser le même type pour ne pas spam
  );

  revalidatePath("/challenges");
  return { success: true };
}

// === Annuler un challenge (créateur uniquement) ===
export async function cancelChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("challenges")
    .update({ status: "cancelled" })
    .eq("id", challengeId)
    .eq("creator_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error cancelling challenge:", error);
    return { success: false, error: "Erreur lors de l'annulation" };
  }

  revalidatePath("/challenges");
  return { success: true };
}

// === Récupérer tous les challenges de l'utilisateur ===
export async function getChallenges(): Promise<ChallengeWithDetails[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select(
      `
      *,
      creator:profiles!challenges_creator_id_fkey(id, username, display_name, avatar_url, plan),
      challenger:profiles!challenges_challenger_id_fkey(id, username, display_name, avatar_url, plan)
    `
    )
    .or(`creator_id.eq.${user.id},challenger_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching challenges:", error);
    return [];
  }

  // Récupérer les progressions
  const challengeIds = challenges.map((c) => c.id);
  const { data: progressData } = await supabase
    .from("challenge_progress")
    .select("*")
    .in("challenge_id", challengeIds);

  // Mapper les progressions
  const progressMap = new Map<string, Map<string, ChallengeProgress>>();
  progressData?.forEach((p) => {
    if (!progressMap.has(p.challenge_id)) {
      progressMap.set(p.challenge_id, new Map());
    }
    progressMap.get(p.challenge_id)!.set(p.user_id, p as ChallengeProgress);
  });

  // Récupérer les morceaux pour les challenges song_mastery
  const songIds = challenges
    .filter((c) => c.song_id)
    .map((c) => c.song_id);

  const songsMap = new Map<string, Song>();
  if (songIds.length > 0) {
    const { data: songs } = await supabase
      .from("songs")
      .select("*")
      .in("id", songIds);

    songs?.forEach((s) => songsMap.set(s.id, s as Song));
  }

  return challenges.map((challenge) => {
    const challengeProgress = progressMap.get(challenge.id);

    return {
      ...challenge,
      creator: challenge.creator as Profile,
      challenger: challenge.challenger as Profile,
      creator_progress: challengeProgress?.get(challenge.creator_id) || null,
      challenger_progress: challengeProgress?.get(challenge.challenger_id) || null,
      song: challenge.song_id ? songsMap.get(challenge.song_id) : null,
    } as ChallengeWithDetails;
  });
}

// === Compter les invitations en attente ===
export async function getPendingChallengesCount(): Promise<number> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })
    .eq("challenger_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error counting pending challenges:", error);
    return 0;
  }

  return count || 0;
}

// === Mettre à jour la progression des challenges actifs ===
export async function updateChallengeProgress(
  sessionMinutes?: number,
  songMasteredId?: string
): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  // Récupérer les challenges actifs de l'utilisateur
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("status", "active")
    .or(`creator_id.eq.${user.id},challenger_id.eq.${user.id}`);

  if (!challenges || challenges.length === 0) {
    return;
  }

  // Une seule requete pour toutes les progressions, au lieu d'une par
  // challenge. Cette fonction est appelee a la fin de chaque session de
  // pratique : elle etait sur le chemin chaud.
  const { data: allProgress } = await supabase
    .from("challenge_progress")
    .select("*")
    .in(
      "challenge_id",
      challenges.map((c) => c.id)
    )
    .eq("user_id", user.id);

  const progressByChallenge = new Map(
    (allProgress ?? []).map((p) => [p.challenge_id, p])
  );

  // Les ecritures sont accumulees puis envoyees en parallele en fin de boucle.
  const writes: PromiseLike<unknown>[] = [];

  for (const challenge of challenges) {
    const progress = progressByChallenge.get(challenge.id);

    if (!progress) continue;

    const updates: Partial<ChallengeProgress> = {};

    // Mettre à jour selon le type de challenge
    if (challenge.challenge_type === "practice_time" && sessionMinutes) {
      updates.practice_minutes = (progress.practice_minutes || 0) + sessionMinutes;
    }

    if (challenge.challenge_type === "streak" && sessionMinutes) {
      const today = new Date().toISOString().split("T")[0];
      const lastDate = progress.streak_last_date;

      if (!lastDate) {
        // Premier jour de streak
        updates.streak_days = 1;
        updates.streak_last_date = today;
      } else if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (lastDate === yesterdayStr) {
          // Jour consécutif
          updates.streak_days = (progress.streak_days || 0) + 1;
          updates.streak_last_date = today;
        } else if (lastDate < yesterdayStr) {
          // Streak cassé
          updates.streak_days = 1;
          updates.streak_last_date = today;
        }
      }
    }

    if (challenge.challenge_type === "song_mastery" && songMasteredId) {
      if (challenge.song_id === songMasteredId && !progress.song_mastered_at) {
        updates.song_mastered_at = new Date().toISOString();

        // Vérifier si c'est le premier à maîtriser = victoire immédiate
        writes.push(completeChallenge(challenge.id, user.id));
      }
    }

    // Appliquer les mises à jour si nécessaire
    if (Object.keys(updates).length > 0) {
      writes.push(
        supabase.from("challenge_progress").update(updates).eq("id", progress.id)
      );
    }
  }

  await Promise.all(writes);

  revalidatePath("/challenges");
}

// === Compléter un challenge et déterminer le gagnant ===
async function completeChallenge(
  challengeId: string,
  winnerId?: string
): Promise<void> {
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      `
      *,
      creator:profiles!challenges_creator_id_fkey(username, display_name),
      challenger:profiles!challenges_challenger_id_fkey(username, display_name)
    `
    )
    .eq("id", challengeId)
    .single();

  if (!challenge) return;

  let finalWinnerId = winnerId;

  // Si pas de gagnant déterminé (song_mastery), calculer selon les progressions
  if (!finalWinnerId) {
    const { data: progressData } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("challenge_id", challengeId);

    if (progressData && progressData.length === 2) {
      const [p1, p2] = progressData;

      if (challenge.challenge_type === "practice_time") {
        if (p1.practice_minutes > p2.practice_minutes) {
          finalWinnerId = p1.user_id;
        } else if (p2.practice_minutes > p1.practice_minutes) {
          finalWinnerId = p2.user_id;
        }
        // Égalité = pas de gagnant
      } else if (challenge.challenge_type === "streak") {
        if (p1.streak_days > p2.streak_days) {
          finalWinnerId = p1.user_id;
        } else if (p2.streak_days > p1.streak_days) {
          finalWinnerId = p2.user_id;
        }
      }
    }
  }

  // Mettre à jour le challenge
  await supabase
    .from("challenges")
    .update({
      status: "completed",
      winner_id: finalWinnerId || null,
    })
    .eq("id", challengeId);

  // Créer des activités et envoyer des notifications
  const creatorProfile = challenge.creator as Profile;
  const challengerProfile = challenge.challenger as Profile;

  if (finalWinnerId) {
    const winnerName =
      finalWinnerId === challenge.creator_id
        ? creatorProfile.display_name || creatorProfile.username
        : challengerProfile.display_name || challengerProfile.username;

    const loserId =
      finalWinnerId === challenge.creator_id
        ? challenge.challenger_id
        : challenge.creator_id;

    // Notifier le gagnant
    await sendPushNotification(
      finalWinnerId,
      {
        title: "Tu as gagné ! 🏆",
        body: `Félicitations, tu as remporté le défi !`,
        data: { url: "/challenges" },
      },
      "challenge_won"
    );

    // Notifier le perdant
    await sendPushNotification(
      loserId,
      {
        title: "Défi terminé",
        body: `${winnerName} a remporté le défi. La prochaine sera la bonne !`,
        data: { url: "/challenges" },
      },
      "challenge_completed"
    );

    // Créer une activité pour le gagnant
    // Note: on utilise createActivity du côté du gagnant via un trick
    await supabase.from("activities").insert({
      user_id: finalWinnerId,
      type: "challenge_won",
      reference_id: challengeId,
      metadata: {
        challenge_type: challenge.challenge_type,
        opponent_name:
          finalWinnerId === challenge.creator_id
            ? challengerProfile.display_name || challengerProfile.username
            : creatorProfile.display_name || creatorProfile.username,
      },
    });
  } else {
    // Égalité - notifier les deux
    await sendPushNotification(
      challenge.creator_id,
      {
        title: "Défi terminé - Égalité !",
        body: "Le défi s'est terminé sur une égalité parfaite !",
        data: { url: "/challenges" },
      },
      "challenge_completed"
    );

    await sendPushNotification(
      challenge.challenger_id,
      {
        title: "Défi terminé - Égalité !",
        body: "Le défi s'est terminé sur une égalité parfaite !",
        data: { url: "/challenges" },
      },
      "challenge_completed"
    );
  }

  revalidatePath("/challenges");
  revalidatePath("/feed");
}

// === Vérifier et compléter les challenges expirés ===
export async function checkExpiredChallenges(): Promise<void> {
  const supabase = await createClient();

  const { data: expiredChallenges } = await supabase
    .from("challenges")
    .select("id")
    .eq("status", "active")
    .lt("ends_at", new Date().toISOString());

  if (!expiredChallenges) return;

  for (const challenge of expiredChallenges) {
    await completeChallenge(challenge.id);
  }
}

// === Récupérer le leaderboard ===
export async function getLeaderboard(
  period: LeaderboardPeriod = "week"
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  // Appeler la fonction PostgreSQL
  const { data, error } = await supabase.rpc("get_practice_leaderboard", {
    p_user_id: user.id,
    p_period: period,
    p_limit: 10,
  });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return (data || []) as LeaderboardEntry[];
}

// === Vérifier s'il existe un challenge actif avec un ami ===
export async function getActiveChallengeWithFriend(
  friendId: string
): Promise<ChallengeWithDetails | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      `
      *,
      creator:profiles!challenges_creator_id_fkey(id, username, display_name, avatar_url, plan),
      challenger:profiles!challenges_challenger_id_fkey(id, username, display_name, avatar_url, plan)
    `
    )
    .in("status", ["pending", "active"])
    .or(
      `and(creator_id.eq.${user.id},challenger_id.eq.${friendId}),and(creator_id.eq.${friendId},challenger_id.eq.${user.id})`
    )
    .single();

  if (!challenge) {
    return null;
  }

  return {
    ...challenge,
    creator: challenge.creator as Profile,
    challenger: challenge.challenger as Profile,
    creator_progress: null,
    challenger_progress: null,
  } as ChallengeWithDetails;
}

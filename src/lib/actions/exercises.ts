"use server";

import { getLocale } from "next-intl/server";
import { tErr } from "@/i18n/server";
import { localizeExercise } from "@/lib/exercise-i18n";
import { revalidatePath } from "next/cache";
import { exerciseFitsInstrument } from "@/lib/instruments";
import { getMyPrimaryInstrument } from "@/lib/instruments-server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type {
  Instrument,
  Exercise,
  ExerciseWithProgress,
  UserExercise,
  ExerciseCategory,
  ExerciseDifficulty,
  CreateUserExerciseProgressInput,
  CreateExerciseInput,
} from "@/types";

// =============================================
// Récupération des exercices
// =============================================

export async function getExercises(filters?: {
  category?: ExerciseCategory;
  difficulty?: ExerciseDifficulty;
}): Promise<ExerciseWithProgress[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  // Récupérer les exercices avec le profil du créateur
  let query = supabase
    .from("exercises")
    .select("*, creator:profiles!exercises_created_by_fkey(id, display_name, username)")
    .order("category")
    .order("difficulty")
    .order("name");

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  const [{ data: allExercises, error: exercisesError }, { data: myInstruments }] = await Promise.all([
    query,
    supabase.from("profile_instruments").select("instrument").eq("user_id", user.id),
  ]);

  if (exercisesError) {
    console.error("Error fetching exercises:", exercisesError);
    return [];
  }

  /*
   * Seulement ce qui parle a mes instruments : un batteur ne voit pas le
   * sweep picking. Les exercices pour tous (liste vide) et ceux que j'ai
   * crees restent toujours la.
   */
  const played = (myInstruments ?? []).map((row) => row.instrument as Instrument);
  const exercises = (allExercises ?? []).filter(
    (exercise) =>
      exercise.created_by === user.id ||
      played.length === 0 ||
      played.some((instrument) => exerciseFitsInstrument(exercise, instrument))
  );

  // Récupérer la progression de l'utilisateur
  const { data: userProgress, error: progressError } = await supabase
    .from("user_exercises")
    .select("*")
    .eq("user_id", user.id);

  if (progressError) {
    console.error("Error fetching user progress:", progressError);
  }

  // Combiner les données
  const progressMap = new Map<string, UserExercise>();
  if (userProgress) {
    userProgress.forEach((progress) => {
      progressMap.set(progress.exercise_id, progress as UserExercise);
    });
  }

  const locale = await getLocale();
  return exercises.map((exercise) => {
    const creator = exercise.creator as { id: string; display_name: string; username: string } | null;
    const isFromFriend = !exercise.is_system && exercise.created_by !== user.id && exercise.shared_with_friends;
    return {
      ...localizeExercise(exercise as Exercise, locale),
      user_progress: progressMap.get(exercise.id),
      creator_name: creator?.display_name || creator?.username || undefined,
      is_from_friend: isFromFriend,
    };
  });
}

export async function getExercise(id: string): Promise<ExerciseWithProgress | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  // Récupérer l'exercice
  const { data: exercise, error: exerciseError } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();

  if (exerciseError || !exercise) {
    console.error("Error fetching exercise:", exerciseError);
    return null;
  }

  // Récupérer la progression de l'utilisateur pour cet exercice
  const { data: progress, error: progressError } = await supabase
    .from("user_exercises")
    .select("*")
    .eq("user_id", user.id)
    .eq("exercise_id", id)
    .single();

  if (progressError && progressError.code !== "PGRST116") {
    console.error("Error fetching user progress:", progressError);
  }

  return {
    ...localizeExercise(exercise as Exercise, await getLocale()),
    user_progress: progress as UserExercise | undefined,
  };
}

// =============================================
// Gestion de la progression utilisateur
// =============================================

export async function getUserExerciseProgress(
  exerciseId: string
): Promise<UserExercise | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_exercises")
    .select("*")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user exercise progress:", error);
    return null;
  }

  return data as UserExercise | null;
}

export async function updateUserExerciseProgress(
  input: CreateUserExerciseProgressInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  // Vérifier si une progression existe déjà
  const { data: existing } = await supabase
    .from("user_exercises")
    .select("*")
    .eq("user_id", user.id)
    .eq("exercise_id", input.exercise_id)
    .single();

  if (existing) {
    // Mettre à jour la progression existante
    const newBestBpm = Math.max(existing.best_bpm, input.bpm_achieved || input.current_bpm);

    const { error } = await supabase
      .from("user_exercises")
      .update({
        current_bpm: input.current_bpm,
        best_bpm: newBestBpm,
        total_practice_minutes: existing.total_practice_minutes + input.duration_minutes,
        sessions_count: existing.sessions_count + 1,
        last_practiced_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating user exercise progress:", error);
      return { success: false, error: await tErr("updateFailed") };
    }
  } else {
    // Créer une nouvelle progression
    const { error } = await supabase.from("user_exercises").insert({
      user_id: user.id,
      exercise_id: input.exercise_id,
      current_bpm: input.current_bpm,
      best_bpm: input.bpm_achieved || input.current_bpm,
      total_practice_minutes: input.duration_minutes,
      sessions_count: 1,
      last_practiced_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating user exercise progress:", error);
      return { success: false, error: await tErr("createFailed") };
    }
  }

  revalidatePath("/practice");
  return { success: true };
}

// =============================================
// Statistiques des exercices
// =============================================

export async function getExerciseStats(): Promise<{
  totalExercisesPracticed: number;
  totalExerciseMinutes: number;
  favoriteCategory: ExerciseCategory | null;
  averageBpmImprovement: number;
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      totalExercisesPracticed: 0,
      totalExerciseMinutes: 0,
      favoriteCategory: null,
      averageBpmImprovement: 0,
    };
  }

  // Récupérer toutes les progressions de l'utilisateur avec les exercices
  const { data: userExercises, error } = await supabase
    .from("user_exercises")
    .select(`
      *,
      exercise:exercises(*)
    `)
    .eq("user_id", user.id);

  if (error || !userExercises) {
    console.error("Error fetching exercise stats:", error);
    return {
      totalExercisesPracticed: 0,
      totalExerciseMinutes: 0,
      favoriteCategory: null,
      averageBpmImprovement: 0,
    };
  }

  const totalExercisesPracticed = userExercises.length;
  const totalExerciseMinutes = userExercises.reduce(
    (sum, ue) => sum + ue.total_practice_minutes,
    0
  );

  // Calculer la catégorie favorite
  const categoryCount = new Map<ExerciseCategory, number>();
  userExercises.forEach((ue) => {
    const category = (ue.exercise as Exercise).category;
    categoryCount.set(category, (categoryCount.get(category) || 0) + ue.sessions_count);
  });

  let favoriteCategory: ExerciseCategory | null = null;
  let maxCount = 0;
  categoryCount.forEach((count, category) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteCategory = category;
    }
  });

  // Calculer l'amélioration moyenne du BPM
  let totalImprovement = 0;
  let improvementCount = 0;
  userExercises.forEach((ue) => {
    const exercise = ue.exercise as Exercise;
    if (ue.best_bpm > exercise.starting_bpm) {
      const improvement =
        ((ue.best_bpm - exercise.starting_bpm) /
          (exercise.target_bpm - exercise.starting_bpm)) *
        100;
      totalImprovement += Math.min(improvement, 100);
      improvementCount++;
    }
  });

  const averageBpmImprovement =
    improvementCount > 0 ? Math.round(totalImprovement / improvementCount) : 0;

  return {
    totalExercisesPracticed,
    totalExerciseMinutes,
    favoriteCategory,
    averageBpmImprovement,
  };
}

// =============================================
// Enregistrer une session d'exercice dans practice_session_exercises
// =============================================

export async function recordExerciseInSession(
  practiceSessionId: string,
  exerciseId: string,
  durationMinutes: number,
  bpmAchieved?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase.from("practice_session_exercises").insert({
    practice_session_id: practiceSessionId,
    exercise_id: exerciseId,
    duration_minutes: durationMinutes,
    bpm_achieved: bpmAchieved,
  });

  if (error) {
    console.error("Error recording exercise in session:", error);
    return { success: false, error: await tErr("saveFailed") };
  }

  return { success: true };
}

// =============================================
// Récupérer les exercices récemment pratiqués
// =============================================

export async function getRecentlyPracticedExercises(
  limit = 5
): Promise<ExerciseWithProgress[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data: userExercises, error } = await supabase
    .from("user_exercises")
    .select(`
      *,
      exercise:exercises(*)
    `)
    .eq("user_id", user.id)
    .order("last_practiced_at", { ascending: false })
    .limit(limit);

  if (error || !userExercises) {
    console.error("Error fetching recently practiced exercises:", error);
    return [];
  }

  const locale = await getLocale();
  return userExercises.map((ue) => ({
    ...localizeExercise(ue.exercise as Exercise, locale),
    user_progress: {
      id: ue.id,
      user_id: ue.user_id,
      exercise_id: ue.exercise_id,
      current_bpm: ue.current_bpm,
      best_bpm: ue.best_bpm,
      total_practice_minutes: ue.total_practice_minutes,
      sessions_count: ue.sessions_count,
      last_practiced_at: ue.last_practiced_at,
      created_at: ue.created_at,
      updated_at: ue.updated_at,
    } as UserExercise,
  }));
}

// =============================================
// Création d'exercices personnalisés
// =============================================

export async function createExercise(
  input: CreateExerciseInput
): Promise<{ success: boolean; error?: string; exercise?: Exercise }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: input.name,
      description: input.description || null,
      category: input.category,
      difficulty: input.difficulty,
      starting_bpm: input.starting_bpm,
      target_bpm: input.target_bpm,
      bpm_increment: input.bpm_increment,
      time_signature: input.time_signature,
      instructions: input.instructions.filter(Boolean),
      tips: input.tips.filter(Boolean),
      duration_minutes: input.duration_minutes,
      is_system: false,
      shared_with_friends: input.shared_with_friends || false,
      instruments: input.instruments ?? [await getMyPrimaryInstrument()],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating exercise:", error);
    return { success: false, error: await tErr("exerciseCreateFailed") };
  }

  // Notifier les amis si partagé
  if (input.shared_with_friends && data) {
    createActivity({
      type: "exercise_shared",
      reference_id: data.id,
      metadata: { exercise_name: input.name },
    }).catch(console.error);
  }

  revalidatePath("/practice");
  return { success: true, exercise: data as Exercise };
}

// =============================================
// Partager / Départager un exercice avec ses amis
// =============================================

export async function toggleShareExercise(
  exerciseId: string
): Promise<{ success: boolean; shared?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  // Récupérer l'exercice
  const { data: exercise, error: fetchError } = await supabase
    .from("exercises")
    .select("id, created_by, is_system, shared_with_friends")
    .eq("id", exerciseId)
    .single();

  if (fetchError || !exercise) {
    return { success: false, error: await tErr("exerciseNotFound") };
  }

  if (exercise.is_system || exercise.created_by !== user.id) {
    return { success: false, error: await tErr("ownExercisesOnly") };
  }

  const newShared = !exercise.shared_with_friends;

  const { error } = await supabase
    .from("exercises")
    .update({ shared_with_friends: newShared })
    .eq("id", exerciseId);

  if (error) {
    console.error("Error toggling share:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  // Notifier les amis quand on active le partage
  if (newShared) {
    // Récupérer le nom de l'exercice
    const { data: exerciseData } = await supabase
      .from("exercises")
      .select("name")
      .eq("id", exerciseId)
      .single();

    if (exerciseData) {
      createActivity({
        type: "exercise_shared",
        reference_id: exerciseId,
        metadata: { exercise_name: exerciseData.name },
      }).catch(console.error);
    }
  }

  revalidatePath("/practice");
  return { success: true, shared: newShared };
}

// =============================================
// Supprimer un exercice personnel
// =============================================

export async function deleteExercise(
  exerciseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("created_by", user.id)
    .eq("is_system", false);

  if (error) {
    console.error("Error deleting exercise:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  revalidatePath("/practice");
  return { success: true };
}

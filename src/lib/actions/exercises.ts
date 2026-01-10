"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Exercise,
  ExerciseWithProgress,
  UserExercise,
  ExerciseCategory,
  ExerciseDifficulty,
  CreateUserExerciseProgressInput,
} from "@/types";

// =============================================
// Récupération des exercices
// =============================================

export async function getExercises(filters?: {
  category?: ExerciseCategory;
  difficulty?: ExerciseDifficulty;
}): Promise<ExerciseWithProgress[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Récupérer les exercices
  let query = supabase
    .from("exercises")
    .select("*")
    .order("category")
    .order("difficulty")
    .order("name");

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  const { data: exercises, error: exercisesError } = await query;

  if (exercisesError) {
    console.error("Error fetching exercises:", exercisesError);
    return [];
  }

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

  return (exercises as Exercise[]).map((exercise) => ({
    ...exercise,
    user_progress: progressMap.get(exercise.id),
  }));
}

export async function getExercise(id: string): Promise<ExerciseWithProgress | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    ...(exercise as Exercise),
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
  const { data: { user } } = await supabase.auth.getUser();

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
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
      return { success: false, error: "Erreur lors de la mise à jour" };
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
      return { success: false, error: "Erreur lors de la création" };
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
  const { data: { user } } = await supabase.auth.getUser();

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase.from("practice_session_exercises").insert({
    practice_session_id: practiceSessionId,
    exercise_id: exerciseId,
    duration_minutes: durationMinutes,
    bpm_achieved: bpmAchieved,
  });

  if (error) {
    console.error("Error recording exercise in session:", error);
    return { success: false, error: "Erreur lors de l'enregistrement" };
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
  const { data: { user } } = await supabase.auth.getUser();

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

  return userExercises.map((ue) => ({
    ...(ue.exercise as Exercise),
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

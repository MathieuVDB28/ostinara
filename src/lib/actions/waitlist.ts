"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import { waitlistConfirmationEmail } from "@/lib/email/waitlist-confirmation";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import type { Instrument, UserPlan } from "@/types";

export interface JoinWaitlistInput {
  email: string;
  plan: UserPlan;
  /** Ce que joue l'inscrit : au moins un instrument. */
  instruments: Instrument[];
  /** D'ou vient le visiteur : ?ref=… ou ?utm_source=… */
  source?: string | null;
  /** Champ piege, invisible pour un humain. Rempli = robot. */
  website?: string;
}

export interface JoinWaitlistResult {
  success: boolean;
  error?: string;
  /** Rang dans la liste. Absent si l'adresse etait deja inscrite. */
  rank?: number;
  /** Un email de confirmation part-il ? */
  confirmationSent?: boolean;
}

const PLANS: UserPlan[] = ["free", "pro", "band"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://ostinara.vercel.app").replace(/\/$/, "");
}

// === S'inscrire sur la liste d'attente (/acces-anticipe) ===
export async function joinWaitlist(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
  // Un robot recoit la meme reponse qu'un humain : rien a apprendre.
  if (input.website) return { success: true };

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { success: false, error: "Cette adresse email n'a pas l'air valide." };
  }
  if (!PLANS.includes(input.plan)) {
    return { success: false, error: "Choisis un plan." };
  }
  const instruments = [...new Set(input.instruments ?? [])];
  if (instruments.length === 0 || instruments.some((i) => !INSTRUMENT_VALUES.includes(i))) {
    return { success: false, error: "Dis-nous de quoi tu joues." };
  }

  const source = input.source?.trim().toLowerCase().slice(0, 64) || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("join_waitlist", { p_email: email, p_plan: input.plan, p_source: source, p_instruments: instruments })
    .maybeSingle<{ signup_rank: number; unsubscribe_token: string }>();

  if (error) {
    console.error("Error joining waitlist:", error);
    return { success: false, error: "Oups, ça n'est pas passé. Réessaie dans un instant." };
  }

  // Deja inscrit : meme succes, sans rang ni nouvel email, pour ne rien
  // reveler de l'inscription existante.
  if (!data) return { success: true };

  const { signup_rank: rank, unsubscribe_token: token } = data;

  if (!isEmailConfigured()) return { success: true, rank, confirmationSent: false };

  // L'email part apres la reponse : le formulaire n'attend pas Resend.
  after(async () => {
    const unsubscribeUrl = `${appUrl()}/acces-anticipe/desinscription?token=${token}`;
    const message = waitlistConfirmationEmail({ plan: input.plan, rank, unsubscribeUrl, appUrl: appUrl() });
    await sendEmail({
      to: email,
      ...message,
      headers: {
        // Desinscription en un clic depuis Gmail / Apple Mail (RFC 8058).
        "List-Unsubscribe": `<${appUrl()}/api/waitlist/unsubscribe?token=${token}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  });

  return { success: true, rank, confirmationSent: true };
}

// === Places deja prises, pour le compteur de l'offre de lancement ===
export async function getWaitlistCount(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("waitlist_count");
  if (error) {
    console.error("Error counting waitlist:", error);
    return null;
  }
  return data as number;
}

// === Quitter la liste depuis le lien d'un email ===
export async function leaveWaitlist(token: string): Promise<{ success: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { success: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leave_waitlist", { p_token: token });
  if (error) {
    console.error("Error leaving waitlist:", error);
    return { success: false };
  }
  return { success: Boolean(data) };
}

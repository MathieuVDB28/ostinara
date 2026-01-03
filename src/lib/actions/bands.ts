"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import { sendPushNotification } from "@/lib/notifications";
import type {
  Band,
  BandWithMembers,
  BandMemberWithProfile,
  BandInvitationWithDetails,
  CreateBandInput,
  UpdateBandInput,
  Profile,
  Song,
} from "@/types";

// === Check if user has Band plan ===
async function hasBandPlan(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  return profile?.plan === "band";
}

// === Get user's bands ===
export async function getUserBands(): Promise<BandWithMembers[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get bands where user is a member
  const { data: memberships } = await supabase
    .from("band_members")
    .select("band_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const bandIds = memberships.map((m) => m.band_id);

  const { data: bands, error } = await supabase
    .from("bands")
    .select(
      `
      *,
      owner:profiles!bands_owner_id_fkey(id, username, display_name, avatar_url, plan),
      members:band_members(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `
    )
    .in("id", bandIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bands:", error);
    return [];
  }

  return bands as BandWithMembers[];
}

// === Get a single band ===
export async function getBand(bandId: string): Promise<BandWithMembers | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: band, error } = await supabase
    .from("bands")
    .select(
      `
      *,
      owner:profiles!bands_owner_id_fkey(id, username, display_name, avatar_url, plan),
      members:band_members(
        *,
        profile:profiles(id, username, display_name, avatar_url, plan)
      )
    `
    )
    .eq("id", bandId)
    .single();

  if (error) {
    console.error("Error fetching band:", error);
    return null;
  }

  return band as BandWithMembers;
}

// === Create a band ===
export async function createBand(
  input: CreateBandInput
): Promise<{ success: boolean; error?: string; band?: Band }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Check Band plan
  const hasPlan = await hasBandPlan();
  if (!hasPlan) {
    return {
      success: false,
      error: "Tu dois avoir le plan Band pour creer un groupe",
    };
  }

  // Create band
  const { data: band, error: bandError } = await supabase
    .from("bands")
    .insert({
      ...input,
      owner_id: user.id,
    })
    .select()
    .single();

  if (bandError) {
    console.error("Error creating band:", bandError);
    return { success: false, error: "Erreur lors de la creation du groupe" };
  }

  // Add owner as member with owner role
  const { error: memberError } = await supabase.from("band_members").insert({
    band_id: band.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    console.error("Error adding owner as member:", memberError);
    // Rollback band creation
    await supabase.from("bands").delete().eq("id", band.id);
    return { success: false, error: "Erreur lors de la creation du groupe" };
  }

  // Create activity
  await createActivity({
    type: "band_created",
    reference_id: band.id,
    metadata: { band_name: band.name },
  });

  revalidatePath("/setlists");
  return { success: true, band: band as Band };
}

// === Update a band ===
export async function updateBand(
  bandId: string,
  input: UpdateBandInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("bands")
    .update(input)
    .eq("id", bandId)
    .eq("owner_id", user.id);

  if (error) {
    console.error("Error updating band:", error);
    return { success: false, error: "Erreur lors de la mise a jour" };
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === Delete a band ===
export async function deleteBand(
  bandId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("bands")
    .delete()
    .eq("id", bandId)
    .eq("owner_id", user.id);

  if (error) {
    console.error("Error deleting band:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === Invite user to band ===
export async function inviteToBand(
  bandId: string,
  inviteeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Check if user is member of the band
  const { data: membership } = await supabase
    .from("band_members")
    .select("role")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { success: false, error: "Tu n'es pas membre de ce groupe" };
  }

  // Check if invitee is already a member
  const { data: existingMember } = await supabase
    .from("band_members")
    .select("id")
    .eq("band_id", bandId)
    .eq("user_id", inviteeId)
    .single();

  if (existingMember) {
    return { success: false, error: "Cette personne est deja membre du groupe" };
  }

  // Check if invitation already exists
  const { data: existingInvitation } = await supabase
    .from("band_invitations")
    .select("id")
    .eq("band_id", bandId)
    .eq("invitee_id", inviteeId)
    .eq("status", "pending")
    .single();

  if (existingInvitation) {
    return { success: false, error: "Une invitation est deja en attente" };
  }

  // Get band and inviter info for notification
  const [{ data: band }, { data: inviterProfile }] = await Promise.all([
    supabase.from("bands").select("name").eq("id", bandId).single(),
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single(),
  ]);

  // Create invitation
  const { error } = await supabase.from("band_invitations").insert({
    band_id: bandId,
    inviter_id: user.id,
    invitee_id: inviteeId,
    status: "pending",
  });

  if (error) {
    console.error("Error creating invitation:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'invitation" };
  }

  // Send push notification
  const inviterName =
    inviterProfile?.display_name || inviterProfile?.username || "Quelqu'un";
  await sendPushNotification(
    inviteeId,
    {
      title: "Invitation a un groupe",
      body: `${inviterName} t'invite a rejoindre ${band?.name}`,
      data: { url: "/setlists" },
    },
    "band_invitation"
  );

  revalidatePath("/setlists");
  return { success: true };
}

// === Accept band invitation ===
export async function acceptBandInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Get invitation
  const { data: invitation } = await supabase
    .from("band_invitations")
    .select("*, band:bands(name)")
    .eq("id", invitationId)
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .single();

  if (!invitation) {
    return { success: false, error: "Invitation non trouvee" };
  }

  // Update invitation status
  await supabase
    .from("band_invitations")
    .update({ status: "accepted" })
    .eq("id", invitationId);

  // Add as member
  const { error: memberError } = await supabase.from("band_members").insert({
    band_id: invitation.band_id,
    user_id: user.id,
    role: "member",
  });

  if (memberError) {
    console.error("Error adding member:", memberError);
    return { success: false, error: "Erreur lors de l'ajout au groupe" };
  }

  // Create activity
  await createActivity({
    type: "band_joined",
    reference_id: invitation.band_id,
    metadata: {
      band_name: (invitation.band as { name: string })?.name || "Groupe",
    },
  });

  revalidatePath("/setlists");
  return { success: true };
}

// === Decline band invitation ===
export async function declineBandInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  const { error } = await supabase
    .from("band_invitations")
    .update({ status: "declined" })
    .eq("id", invitationId)
    .eq("invitee_id", user.id);

  if (error) {
    console.error("Error declining invitation:", error);
    return { success: false, error: "Erreur lors du refus" };
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === Get pending invitations for user ===
export async function getPendingBandInvitations(): Promise<
  BandInvitationWithDetails[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("band_invitations")
    .select(
      `
      *,
      band:bands(*),
      inviter:profiles!band_invitations_inviter_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }

  return data as BandInvitationWithDetails[];
}

// === Leave band ===
export async function leaveBand(
  bandId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Check if user is owner
  const { data: band } = await supabase
    .from("bands")
    .select("owner_id")
    .eq("id", bandId)
    .single();

  if (band?.owner_id === user.id) {
    return {
      success: false,
      error:
        "Le proprietaire ne peut pas quitter le groupe. Transfere la propriete ou supprime le groupe.",
    };
  }

  const { error } = await supabase
    .from("band_members")
    .delete()
    .eq("band_id", bandId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error leaving band:", error);
    return { success: false, error: "Erreur lors du depart" };
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === Remove member from band ===
export async function removeBandMember(
  bandId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifie" };
  }

  // Check if user is owner
  const { data: band } = await supabase
    .from("bands")
    .select("owner_id")
    .eq("id", bandId)
    .single();

  if (band?.owner_id !== user.id) {
    return {
      success: false,
      error: "Seul le proprietaire peut retirer des membres",
    };
  }

  if (memberId === user.id) {
    return { success: false, error: "Tu ne peux pas te retirer toi-meme" };
  }

  const { error } = await supabase
    .from("band_members")
    .delete()
    .eq("band_id", bandId)
    .eq("user_id", memberId);

  if (error) {
    console.error("Error removing member:", error);
    return { success: false, error: "Erreur lors du retrait" };
  }

  revalidatePath("/setlists");
  return { success: true };
}

// === Get band members' songs (for adding to setlist) ===
export async function getBandMembersSongs(
  bandId: string
): Promise<{ member: Profile; songs: Song[] }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get band members
  const { data: members } = await supabase
    .from("band_members")
    .select("user_id, profile:profiles(id, username, display_name, avatar_url)")
    .eq("band_id", bandId);

  if (!members) return [];

  // Get songs for each member
  const memberSongs = await Promise.all(
    members.map(async (member) => {
      const { data: songs } = await supabase
        .from("songs")
        .select("*")
        .eq("user_id", member.user_id)
        .order("title", { ascending: true });

      // Supabase returns profile as array due to typing, but it's actually a single object
      const profile = member.profile as unknown as Profile;

      return {
        member: profile,
        songs: (songs || []) as Song[],
      };
    })
  );

  return memberSongs;
}

// === Search users for invitation ===
export async function searchUsersForBandInvite(
  query: string,
  bandId: string
): Promise<Profile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || query.length < 2) return [];

  // Get current band members
  const { data: members } = await supabase
    .from("band_members")
    .select("user_id")
    .eq("band_id", bandId);

  const memberIds = members?.map((m) => m.user_id) || [];

  // Get pending invitations
  const { data: invitations } = await supabase
    .from("band_invitations")
    .select("invitee_id")
    .eq("band_id", bandId)
    .eq("status", "pending");

  const invitedIds = invitations?.map((i) => i.invitee_id) || [];

  const excludeIds = [...memberIds, ...invitedIds];

  // Search users
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, plan")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .limit(10);

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return users as Profile[];
}

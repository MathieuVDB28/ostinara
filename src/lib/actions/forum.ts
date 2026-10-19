"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { tErr } from "@/i18n/server";
import { isLocale, type Locale } from "@/i18n/config";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { slugify } from "@/lib/blog/document";
import { forumTopicAppHref, isForumCategory, type ForumFilter } from "@/lib/forum";
import { sendPushNotification } from "@/lib/notifications";
import { extractMentions, MAX_MENTIONS } from "@/lib/mentions";
import type {
  ForumCategory,
  ForumGearSnapshot,
  ForumReply,
  ForumReport,
  ForumReportReason,
  ForumTopic,
  ForumTopicSummary,
  Instrument,
} from "@/types";

type Result = { success: boolean; error?: string };

const AUTHOR = "id, username, display_name, avatar_url, staff_role";

const TOPIC_SUMMARY_SELECT = `id, slug, locale, category, title, instruments, reply_count,
  solved_reply_id, is_pinned, is_locked, is_hidden, last_activity_at, created_at,
  author:profiles!forum_topics_author_id_fkey(${AUTHOR})`;

const TOPIC_SELECT = `${TOPIC_SUMMARY_SELECT}, body, images, gear, edited_at`;

const REPLY_SELECT = `id, topic_id, body, vote_count, is_hidden, edited_at, created_at,
  author:profiles!forum_replies_author_id_fkey(${AUTHOR})`;

const PAGE_SIZE = 30;

/** Pour lire ce que la RLS cache aux membres : les abonnes d'un sujet. */
function serviceRole() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Les comptes derriere des pseudos (casse comprise, comme a l'inscription). */
async function resolveUsernames(names: string[]): Promise<{ id: string; username: string }[]> {
  if (names.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", names.slice(0, MAX_MENTIONS * 5));
  return (data ?? []) as { id: string; username: string }[];
}

/**
 * Les pseudos qui existent parmi ceux mentionnes dans ces textes, en
 * minuscules : l'affichage ne met en avant que ceux-la.
 */
export async function getMentionedUsernames(texts: string[]): Promise<string[]> {
  const names = [...new Set(texts.flatMap((text) => extractMentions(text)))];
  return (await resolveUsernames(names)).map((profile) => profile.username.toLowerCase());
}

/**
 * Prevenir les personnes mentionnees dans un message (pas soi-meme). Rend
 * les comptes prevenus, pour ne pas les prevenir une seconde fois au titre
 * d'abonne.
 */
async function notifyMentions(options: {
  text: string;
  authorId: string;
  authorName: string | null;
  topic: { id: string; slug: string; title: string };
  anchor?: string;
}): Promise<Set<string>> {
  const mentioned = (await resolveUsernames(extractMentions(options.text))).filter(
    (profile) => profile.id !== options.authorId
  );
  await Promise.all(
    mentioned.map((profile) =>
      sendPushNotification(
        profile.id,
        (t) => ({
          title: t("forumMention.title"),
          body: t("forumMention.body", { name: options.authorName ?? t("someone"), title: options.topic.title }),
          tag: `forum-mention-${options.topic.id}`,
          data: { url: `${forumTopicAppHref(options.topic.slug)}${options.anchor ?? ""}` },
        }),
        "forum_mention"
      )
    )
  );
  return new Set(mentioned.map((profile) => profile.id));
}

/** Les erreurs levees par les triggers (garde-fous), en clair. */
async function forumError(error: { message?: string; code?: string } | null, fallback: Parameters<typeof tErr>[0]) {
  if (error?.message?.includes("forum_rate_limit")) return tErr("forumRateLimit");
  if (error?.message?.includes("forum_topic_locked")) return tErr("forumTopicLocked");
  return tErr(fallback);
}

function revalidateForum(slug?: string) {
  revalidatePath("/forum");
  revalidatePath("/commu/forum");
  if (slug) {
    revalidatePath(`/forum/${slug}`);
    revalidatePath(`/commu/forum/${slug}`);
  }
}

function cleanImages(images: string[] | undefined): string[] {
  // Seulement des images de notre bucket, 4 au plus
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forum/`;
  return (images ?? []).filter((url) => typeof url === "string" && url.startsWith(prefix)).slice(0, 4);
}

function cleanInstruments(instruments: Instrument[] | undefined): Instrument[] {
  return (instruments ?? []).filter((i) => INSTRUMENT_VALUES.includes(i));
}

// === Lecture ===

/**
 * Les sujets, epingles d'abord puis par derniere activite. Avec une
 * recherche, les plus pertinents d'abord.
 */
export async function getForumTopics(options: {
  category?: ForumCategory | null;
  locale?: Locale | null;
  filter?: ForumFilter;
  query?: string;
  page?: number;
} = {}): Promise<{ topics: ForumTopicSummary[]; hasMore: boolean }> {
  const supabase = await createClient();
  const page = Math.max(0, options.page ?? 0);
  const from = page * PAGE_SIZE;

  let request = options.query?.trim()
    ? supabase
        .rpc("search_forum_topics", {
          p_query: options.query.trim(),
          p_locale: options.locale ?? null,
          p_limit: 50,
        })
        .select(TOPIC_SUMMARY_SELECT)
    : supabase
        .from("forum_topics")
        .select(TOPIC_SUMMARY_SELECT)
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false });

  if (!options.query?.trim() && options.locale) request = request.eq("locale", options.locale);
  if (options.category) request = request.eq("category", options.category);
  if (options.filter === "unanswered") request = request.eq("reply_count", 0);
  if (options.filter === "solved") request = request.not("solved_reply_id", "is", null);

  const { data, error } = await request.range(from, from + PAGE_SIZE);
  if (error) {
    console.error("Error fetching forum topics:", error);
    return { topics: [], hasMore: false };
  }
  const rows = (data ?? []) as unknown as ForumTopicSummary[];
  return { topics: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

/** « Ces sujets ressemblent au tien », pendant qu'on ecrit le titre. */
export async function findSimilarTopics(title: string): Promise<Pick<ForumTopicSummary, "id" | "slug" | "title" | "reply_count" | "solved_reply_id">[]> {
  if (title.trim().length < 8) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("search_forum_topics", { p_query: title, p_any_word: true, p_limit: 5 })
    .select("id, slug, title, reply_count, solved_reply_id");
  return (data ?? []) as Pick<ForumTopicSummary, "id" | "slug" | "title" | "reply_count" | "solved_reply_id">[];
}

export async function getTopicBySlug(slug: string): Promise<ForumTopic | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_topics")
    .select(TOPIC_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("Error fetching forum topic:", error);
    return null;
  }
  return data as unknown as ForumTopic | null;
}

/** Les reponses d'un sujet, dans l'ordre, avec mes votes. */
export async function getTopicReplies(topicId: string): Promise<ForumReply[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("forum_replies")
    .select(REPLY_SELECT)
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching forum replies:", error);
    return [];
  }
  const replies = (data ?? []) as unknown as ForumReply[];
  if (!user || replies.length === 0) return replies;

  const { data: votes } = await supabase
    .from("forum_reply_votes")
    .select("reply_id")
    .eq("user_id", user.id)
    .in("reply_id", replies.map((reply) => reply.id));
  const voted = new Set((votes ?? []).map((vote) => vote.reply_id));
  return replies.map((reply) => ({ ...reply, voted: voted.has(reply.id) }));
}

/** Pour le sitemap. */
export async function getPublicTopicSlugs(): Promise<{ slug: string; last_activity_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("forum_topics")
    .select("slug, last_activity_at")
    .eq("is_hidden", false)
    .order("last_activity_at", { ascending: false })
    .limit(5000);
  return (data ?? []) as { slug: string; last_activity_at: string }[];
}

/** Mon Matos, pour joindre un instrument a un sujet. */
export async function getMyGearForForum(): Promise<(ForumGearSnapshot & { id: string })[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("gear_items")
    .select("id, type, brand, model, year, color, image_url")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as (ForumGearSnapshot & { id: string })[];
}

// === Sujets ===

export interface TopicInput {
  title: string;
  body: string;
  category: ForumCategory;
  locale: Locale;
  instruments?: Instrument[];
  images?: string[];
  /** Un instrument de mon Matos (son id), recopie dans le sujet. */
  gearId?: string | null;
}

async function validateTopic(input: TopicInput): Promise<string | null> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 8 || title.length > 160) return tErr("forumTitleLength");
  if (body.length < 20 || body.length > 10000) return tErr("forumBodyLength");
  if (!isForumCategory(input.category) || !isLocale(input.locale)) return tErr("updateFailed");
  return null;
}

export async function createForumTopic(
  input: TopicInput
): Promise<{ success: boolean; error?: string; slug?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const invalid = await validateTopic(input);
  if (invalid) return { success: false, error: invalid };

  const supabase = await createClient();

  // La fiche du Matos est recopiee ici, d'apres ma ligne (pas d'apres le client)
  let gear: ForumGearSnapshot | null = null;
  if (input.gearId) {
    const { data } = await supabase
      .from("gear_items")
      .select("type, brand, model, year, color, image_url")
      .eq("id", input.gearId)
      .eq("user_id", user.id)
      .maybeSingle();
    gear = (data as ForumGearSnapshot | null) ?? null;
  }

  // Lisible et unique : « mes-cordes-frisent-k3x9q2 »
  const slug = `${slugify(input.title).slice(0, 80) || "sujet"}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from("forum_topics")
    .insert({
      author_id: user.id,
      slug,
      locale: input.locale,
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      instruments: cleanInstruments(input.instruments),
      images: cleanImages(input.images),
      gear,
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    console.error("Error creating forum topic:", error);
    return { success: false, error: await forumError(error, "createFailed") };
  }

  after(async () => {
    const { data: me } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).single();
    await notifyMentions({
      text: input.body,
      authorId: user.id,
      authorName: me?.display_name || me?.username || null,
      topic: { id: data.id, slug: data.slug, title: input.title.trim() },
    });
  });

  revalidateForum();
  return { success: true, slug: data.slug };
}

export async function updateForumTopic(
  id: string,
  input: Omit<TopicInput, "gearId" | "locale"> & { locale?: Locale }
): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const invalid = await validateTopic({ ...input, locale: input.locale ?? "fr" });
  if (invalid) return { success: false, error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_topics")
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      instruments: cleanInstruments(input.instruments),
      images: cleanImages(input.images),
      ...(input.locale ? { locale: input.locale } : {}),
    })
    .eq("id", id)
    .eq("author_id", user.id)
    .select("slug")
    .single();

  if (error || !data) {
    console.error("Error updating forum topic:", error);
    return { success: false, error: await tErr("updateFailed") };
  }
  revalidateForum(data.slug);
  return { success: true };
}

export async function deleteForumTopic(id: string): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase.from("forum_topics").delete().eq("id", id).select("slug");
  if (error || !data?.length) {
    console.error("Error deleting forum topic:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }
  revalidateForum(data[0].slug);
  return { success: true };
}

/** L'auteur du sujet choisit la meilleure reponse (null : aucune). */
export async function setSolvedReply(topicId: string, replyId: string | null): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_topics")
    .update({ solved_reply_id: replyId })
    .eq("id", topicId)
    .eq("author_id", user.id)
    .select("slug, title")
    .single();

  if (error || !data) {
    console.error("Error setting solved reply:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  if (replyId) {
    after(async () => {
      const { data: reply } = await supabase
        .from("forum_replies")
        .select("author_id")
        .eq("id", replyId)
        .single();
      if (!reply || reply.author_id === user.id) return;
      await sendPushNotification(
        reply.author_id,
        (t) => ({
          title: t("forumSolved.title"),
          body: t("forumSolved.body", { title: data.title }),
          tag: `forum-solved-${topicId}`,
          data: { url: `${forumTopicAppHref(data.slug)}#reponse-${replyId}` },
        }),
        "forum_solved"
      );
    });
  }

  revalidateForum(data.slug);
  return { success: true };
}

// === Reponses ===

export async function addForumReply(
  topicId: string,
  body: string
): Promise<{ success: boolean; error?: string; reply?: ForumReply; mentions?: string[] }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const text = body.trim();
  if (text.length < 2 || text.length > 10000) {
    return { success: false, error: await tErr("forumReplyLength") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_replies")
    .insert({ topic_id: topicId, author_id: user.id, body: text })
    .select(REPLY_SELECT)
    .single();

  if (error || !data) {
    console.error("Error adding forum reply:", error);
    return { success: false, error: await forumError(error, "addFailed") };
  }
  const reply = data as unknown as ForumReply;

  // Les personnes mentionnees, puis tous ceux qui suivent le sujet (son
  // auteur et ceux qui y ont repondu, sauf desabonnement)
  after(async () => {
    const { data: topic } = await supabase
      .from("forum_topics")
      .select("id, slug, title")
      .eq("id", topicId)
      .single();
    if (!topic) return;
    const name = reply.author?.display_name || reply.author?.username || null;
    const anchor = `#reponse-${reply.id}`;

    const alreadyNotified = await notifyMentions({ text, authorId: user.id, authorName: name, topic, anchor });

    const { data: followers } = await serviceRole()
      .from("forum_topic_follows")
      .select("user_id")
      .eq("topic_id", topicId)
      .eq("following", true)
      .neq("user_id", user.id);

    await Promise.all(
      (followers ?? [])
        .filter((follower) => !alreadyNotified.has(follower.user_id))
        .map((follower) =>
          sendPushNotification(
            follower.user_id,
            (t) => ({
              title: t("forumReply.title"),
              body: t("forumReply.body", { name: name ?? t("someone"), title: topic.title }),
              tag: `forum-reply-${topicId}`,
              data: { url: `${forumTopicAppHref(topic.slug)}${anchor}` },
            }),
            "forum_reply"
          )
        )
    );
  });

  const mentions = await getMentionedUsernames([text]);
  revalidateForum();
  return { success: true, reply: { ...reply, voted: false }, mentions };
}

export async function updateForumReply(
  id: string,
  body: string
): Promise<{ success: boolean; error?: string; reply?: ForumReply; mentions?: string[] }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const text = body.trim();
  if (text.length < 2 || text.length > 10000) {
    return { success: false, error: await tErr("forumReplyLength") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_replies")
    .update({ body: text })
    .eq("id", id)
    .eq("author_id", user.id)
    .select(REPLY_SELECT)
    .single();

  if (error || !data) {
    console.error("Error updating forum reply:", error);
    return { success: false, error: await tErr("updateFailed") };
  }
  return { success: true, reply: data as unknown as ForumReply, mentions: await getMentionedUsernames([text]) };
}

export async function deleteForumReply(id: string): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase.from("forum_replies").delete().eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("Error deleting forum reply:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }
  revalidateForum();
  return { success: true };
}

/** +1 sur une reponse, ou le retirer. Rend le nouvel etat. */
export async function toggleReplyVote(
  replyId: string
): Promise<{ success: boolean; error?: string; voted?: boolean }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("forum_reply_votes")
    .select("reply_id")
    .eq("reply_id", replyId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("forum_reply_votes").delete().eq("reply_id", replyId).eq("user_id", user.id)
    : await supabase.from("forum_reply_votes").insert({ reply_id: replyId, user_id: user.id });

  if (error) {
    console.error("Error toggling forum vote:", error);
    return { success: false, error: await tErr("forumVoteFailed") };
  }
  return { success: true, voted: !existing };
}

// === Suivre un sujet ===

/** Je suis ce sujet ? (null : pas connecte) */
export async function getTopicFollowing(topicId: string): Promise<boolean | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("forum_topic_follows")
    .select("following")
    .eq("topic_id", topicId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.following ?? false;
}

export async function setTopicFollowing(topicId: string, following: boolean): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("forum_topic_follows")
    .upsert({ topic_id: topicId, user_id: user.id, following }, { onConflict: "topic_id,user_id" });

  if (error) {
    console.error("Error following forum topic:", error);
    return { success: false, error: await tErr("updateFailed") };
  }
  return { success: true };
}

// === Mentions ===

/**
 * Les pseudos proposes quand on tape « @… » : d'abord les gens du sujet
 * (auteur, ceux qui ont repondu), puis les autres comptes.
 */
export async function suggestMentions(
  prefix: string,
  topicId?: string
): Promise<{ username: string; display_name: string | null; avatar_url: string | null }[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const query = prefix.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 40);
  const supabase = await createClient();
  const pattern = `${query.replace(/[_%]/g, "\\$&")}%`;

  let participants: { username: string; display_name: string | null; avatar_url: string | null }[] = [];
  if (topicId) {
    const [{ data: topic }, { data: replies }] = await Promise.all([
      supabase.from("forum_topics").select("author:profiles!forum_topics_author_id_fkey(id, username, display_name, avatar_url)").eq("id", topicId).maybeSingle(),
      supabase.from("forum_replies").select("author:profiles!forum_replies_author_id_fkey(id, username, display_name, avatar_url)").eq("topic_id", topicId).limit(200),
    ]);
    type Row = { author: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null };
    const authors = [topic as unknown as Row | null, ...((replies ?? []) as unknown as Row[])]
      .map((row) => row?.author)
      .filter((author): author is NonNullable<Row["author"]> => Boolean(author) && author!.id !== user.id);
    const seen = new Set<string>();
    participants = authors
      .filter((author) => author.username?.toLowerCase().startsWith(query.toLowerCase()))
      .filter((author) => (seen.has(author.id) ? false : (seen.add(author.id), true)))
      .map(({ username, display_name, avatar_url }) => ({ username, display_name, avatar_url }));
  }

  const { data: others } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .ilike("username", pattern)
    .neq("id", user.id)
    .order("username")
    .limit(8);

  const merged = [...participants];
  for (const profile of (others ?? []) as typeof participants) {
    if (!merged.some((known) => known.username === profile.username)) merged.push(profile);
  }
  // Seulement des pseudos mentionnables (cf. src/lib/mentions.ts)
  return merged.filter((profile) => /^[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_])?$/.test(profile.username)).slice(0, 6);
}

// === Moderation (equipe) ===

export async function moderateTopic(
  id: string,
  changes: Partial<{ is_pinned: boolean; is_locked: boolean; is_hidden: boolean; category: ForumCategory }>
): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  if (changes.category && !isForumCategory(changes.category)) {
    return { success: false, error: await tErr("updateFailed") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_topics")
    .update(changes)
    .eq("id", id)
    .select("slug, is_pinned, is_locked, is_hidden, category")
    .single();

  // Le trigger ignore ce qu'un non-membre de l'equipe n'a pas le droit de
  // changer : on verifie que c'est bien passe.
  const applied = data && Object.entries(changes).every(
    ([key, value]) => (data as Record<string, unknown>)[key] === value
  );
  if (error || !applied) {
    console.error("Error moderating forum topic:", error);
    return { success: false, error: await tErr("staffOnly") };
  }
  revalidateForum(data.slug);
  return { success: true };
}

export async function moderateReply(id: string, hidden: boolean): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_replies")
    .update({ is_hidden: hidden })
    .eq("id", id)
    .select("is_hidden")
    .single();

  if (error || data?.is_hidden !== hidden) {
    console.error("Error moderating forum reply:", error);
    return { success: false, error: await tErr("staffOnly") };
  }
  revalidateForum();
  return { success: true };
}

export async function reportForumContent(input: {
  topicId?: string;
  replyId?: string;
  reason: ForumReportReason;
  note?: string;
}): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };
  if (Boolean(input.topicId) === Boolean(input.replyId)) {
    return { success: false, error: await tErr("updateFailed") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("forum_reports").insert({
    reporter_id: user.id,
    topic_id: input.topicId ?? null,
    reply_id: input.replyId ?? null,
    reason: input.reason,
    note: input.note?.trim().slice(0, 500) || null,
  });

  // 23505 : deja signale par moi, en attente : c'est bon
  if (error && error.code !== "23505") {
    console.error("Error reporting forum content:", error);
    return { success: false, error: await tErr("addFailed") };
  }
  revalidatePath("/commu/forum/moderation");
  return { success: true };
}

export async function getOpenForumReports(): Promise<ForumReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_reports")
    .select(`id, reason, note, created_at,
      reporter:profiles!forum_reports_reporter_id_fkey(id, username, display_name),
      topic:forum_topics(id, slug, title, body, is_hidden),
      reply:forum_replies(id, body, is_hidden, topic:forum_topics!forum_replies_topic_id_fkey(slug, title))`)
    .is("resolved_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching forum reports:", error);
    return [];
  }
  return (data ?? []) as unknown as ForumReport[];
}

export async function getOpenForumReportsCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("forum_reports")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);
  return count ?? 0;
}

export async function resolveForumReport(id: string): Promise<Result> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    console.error("Error resolving forum report:", error);
    return { success: false, error: await tErr("staffOnly") };
  }
  revalidatePath("/commu/forum/moderation");
  return { success: true };
}

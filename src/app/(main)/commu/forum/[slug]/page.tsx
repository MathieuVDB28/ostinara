import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getMentionedUsernames, getTopicBySlug, getTopicFollowing, getTopicReplies } from "@/lib/actions/forum";
import { forumTopicUrl } from "@/lib/forum";
import { TopicView } from "@/components/forum/topic-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return {};
  return { title: `${topic.title} | Ostinara`, alternates: { canonical: forumTopicUrl(topic.slug) } };
}

/** Un sujet dans l'app. L'auteur et l'equipe voient aussi un sujet masque. */
export default async function CommuForumTopicPage({ params }: Props) {
  const { slug } = await params;
  const [user, role, topic] = await Promise.all([getAuthenticatedUser(), getMyStaffRole(), getTopicBySlug(slug)]);
  if (!topic) notFound();
  const [replies, following] = await Promise.all([getTopicReplies(topic.id), getTopicFollowing(topic.id)]);
  const mentions = await getMentionedUsernames([topic.body, ...replies.map((reply) => reply.body)]);

  return (
    <TopicView
      key={topic.id}
      topic={topic}
      initialReplies={replies}
      viewer={{ id: user?.id ?? null, isStaff: role !== null }}
      context="app"
      mentions={mentions}
      following={following}
    />
  );
}

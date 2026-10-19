import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMentionedUsernames, getTopicBySlug, getTopicReplies } from "@/lib/actions/forum";
import { forumTopicAppHref, forumTopicUrl } from "@/lib/forum";
import { siteUrl } from "@/lib/blog/categories";
import { TopicView } from "@/components/forum/topic-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic || topic.is_hidden) return {};
  const description = topic.body.replace(/\s+/g, " ").slice(0, 160);
  return {
    metadataBase: new URL(siteUrl()),
    title: `${topic.title} | Forum Ostinara`,
    description,
    alternates: { canonical: forumTopicUrl(topic.slug) },
    openGraph: {
      type: "article",
      title: topic.title,
      description,
      url: forumTopicUrl(topic.slug),
      images: topic.images[0] ? [{ url: topic.images[0] }] : undefined,
    },
  };
}

export default async function PublicForumTopicPage({ params }: Props) {
  const { slug } = await params;
  // Connecte, on lit (et on repond) dans l'app
  if (await getAuthenticatedUser()) redirect(forumTopicAppHref(slug));

  const topic = await getTopicBySlug(slug);
  if (!topic || topic.is_hidden) notFound();
  const replies = await getTopicReplies(topic.id);
  const visible = replies.filter((reply) => !reply.is_hidden);
  const mentions = await getMentionedUsernames([topic.body, ...visible.map((reply) => reply.body)]);
  const solved = visible.find((reply) => reply.id === topic.solved_reply_id);

  // Donnees structurees « forum » (et la reponse acceptee si le sujet est resolu)
  const person = (author: { display_name?: string; username: string } | null) =>
    author ? { "@type": "Person", name: author.display_name || author.username } : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: topic.title,
    text: topic.body,
    url: `${siteUrl()}${forumTopicUrl(topic.slug)}`,
    datePublished: topic.created_at,
    dateModified: topic.edited_at ?? undefined,
    author: person(topic.author),
    image: topic.images[0],
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: visible.length,
    },
    comment: visible.slice(0, 20).map((reply) => ({
      "@type": "Comment",
      text: reply.body,
      datePublished: reply.created_at,
      author: person(reply.author),
      upvoteCount: reply.vote_count,
      ...(reply.id === solved?.id ? { position: 1 } : {}),
    })),
  };

  return (
    <div className="px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <TopicView topic={topic} initialReplies={visible} viewer={{ id: null, isStaff: false }} context="public" mentions={mentions} following={null} />
    </div>
  );
}

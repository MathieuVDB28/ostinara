import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { profileHref } from "@/lib/navigation";
import { MENTION_PATTERN } from "@/lib/mentions";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

interface Props {
  text: string;
  className?: string;
  /** Les pseudos qui existent (en minuscules) : seules ces mentions ressortent. */
  mentions?: ReadonlySet<string>;
  /** Dans l'app, une mention mene au profil ; en public, elle reste du texte. */
  linkMentions?: boolean;
}

/**
 * Le texte d'un sujet ou d'une reponse : brut, retours a la ligne gardes,
 * liens rendus cliquables, mentions @pseudo mises en avant. Liens sortants
 * en nofollow ugc (contenu des membres, cf. consignes des moteurs de
 * recherche).
 */
export function PlainText({ text, className = "", mentions, linkMentions = false }: Props) {
  function withMentions(chunk: string, key: number): ReactNode {
    if (!mentions?.size) return <Fragment key={key}>{chunk}</Fragment>;
    const nodes: ReactNode[] = [];
    let last = 0;
    for (const match of chunk.matchAll(MENTION_PATTERN)) {
      const name = match[2];
      if (!mentions.has(name.toLowerCase())) continue;
      const at = match.index! + match[1].length;
      nodes.push(chunk.slice(last, at));
      nodes.push(
        linkMentions ? (
          <Link key={`${key}-${at}`} href={profileHref(name)} className="font-semibold text-primary hover:underline">
            @{name}
          </Link>
        ) : (
          <span key={`${key}-${at}`} className="font-semibold text-primary">@{name}</span>
        )
      );
      last = at + name.length + 1;
    }
    nodes.push(chunk.slice(last));
    return <Fragment key={key}>{nodes}</Fragment>;
  }

  const parts = text.split(URL_PATTERN);
  return (
    <div className={`whitespace-pre-line break-words ${className}`}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          withMentions(part, index)
        )
      )}
    </div>
  );
}

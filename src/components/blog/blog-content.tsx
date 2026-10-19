import { Fragment, type ReactNode } from "react";
import {
  EXERCISE_EMBED,
  METRONOME_EMBED,
  SONG_EMBED,
  slugify,
  type BlogDocument,
  type BlogMark,
  type BlogNode,
  type ExerciseEmbedAttrs,
  type MetronomeEmbedAttrs,
  type SongEmbedAttrs,
} from "@/lib/blog/document";
import { SongEmbed } from "./song-embed";
import { MetronomeEmbed } from "./metronome-embed";
import { ExerciseEmbed } from "./exercise-embed";

interface Props {
  document: BlogDocument;
  /** Visiteur sans compte : les blocs menent a l'inscription. */
  signedIn: boolean;
}

/** Un lien sur : http(s), mailto, ou une adresse de l'app. */
function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^(https?:|mailto:)/i.test(value) || (value.startsWith("/") && !value.startsWith("//"))) {
    return value;
  }
  return null;
}

function safeImage(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\//i.test(value) ? value : null;
}

function nodeText(node: BlogNode): string {
  return node.text ?? (node.content ?? []).map(nodeText).join("");
}

function withMark(mark: BlogMark, children: ReactNode, key: number): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{children}</strong>;
    case "italic":
      return <em key={key}>{children}</em>;
    case "underline":
      return <u key={key}>{children}</u>;
    case "strike":
      return <s key={key}>{children}</s>;
    case "code":
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {children}
        </code>
      );
    case "link": {
      const href = safeHref(mark.attrs?.href);
      if (!href) return children;
      const external = !href.startsWith("/");
      return (
        <a
          key={key}
          href={href}
          className="font-medium text-primary underline underline-offset-2"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    }
    default:
      return children;
  }
}

/**
 * Le rendu d'un article, a partir du JSON de l'editeur.
 *
 * Liste blanche : un noeud ou une marque inconnus sont ignores (leur texte
 * reste), un lien ou une image hors http(s) disparaissent. Rien ne passe
 * par dangerouslySetInnerHTML.
 */
export function BlogContent({ document, signedIn }: Props) {
  const render = (nodes: BlogNode[] | undefined): ReactNode =>
    (nodes ?? []).map((node, index) => renderNode(node, index));

  function renderNode(node: BlogNode, key: number): ReactNode {
    switch (node.type) {
      case "text":
        return (
          <Fragment key={key}>
            {(node.marks ?? []).reduce<ReactNode>(
              (children, mark, i) => withMark(mark, children, i),
              node.text ?? ""
            )}
          </Fragment>
        );
      case "paragraph":
        return <p key={key}>{render(node.content)}</p>;
      case "heading": {
        const level = node.attrs?.level === 3 ? 3 : 2;
        const id = slugify(nodeText(node));
        return level === 2 ? (
          <h2 key={key} id={id} className="scroll-mt-24">{render(node.content)}</h2>
        ) : (
          <h3 key={key} id={id} className="scroll-mt-24">{render(node.content)}</h3>
        );
      }
      case "bulletList":
        return <ul key={key}>{render(node.content)}</ul>;
      case "orderedList":
        return <ol key={key}>{render(node.content)}</ol>;
      case "listItem":
        return <li key={key}>{render(node.content)}</li>;
      case "blockquote":
        return <blockquote key={key}>{render(node.content)}</blockquote>;
      case "codeBlock":
        return (
          <pre key={key}>
            <code>{nodeText(node)}</code>
          </pre>
        );
      case "horizontalRule":
        return <hr key={key} />;
      case "hardBreak":
        return <br key={key} />;
      case "image": {
        const src = safeImage(node.attrs?.src);
        if (!src) return null;
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const caption = typeof node.attrs?.title === "string" ? node.attrs.title : "";
        return (
          <figure key={key}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} loading="lazy" className="w-full rounded-xl" />
            {caption && <figcaption>{caption}</figcaption>}
          </figure>
        );
      }
      case SONG_EMBED:
        return (
          <SongEmbed
            key={key}
            song={node.attrs as unknown as SongEmbedAttrs}
            signedIn={signedIn}
          />
        );
      case METRONOME_EMBED:
        return (
          <MetronomeEmbed
            key={key}
            settings={node.attrs as unknown as MetronomeEmbedAttrs}
            signedIn={signedIn}
          />
        );
      case EXERCISE_EMBED:
        return (
          <ExerciseEmbed
            key={key}
            exercise={node.attrs as unknown as ExerciseEmbedAttrs}
            signedIn={signedIn}
          />
        );
      default:
        // Noeud inconnu : on garde son contenu
        return node.content ? <Fragment key={key}>{render(node.content)}</Fragment> : null;
    }
  }

  return <div className="blog-prose">{render(document.content)}</div>;
}

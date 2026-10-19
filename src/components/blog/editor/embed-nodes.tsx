"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { Dumbbell, Trash2 } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import {
  EXERCISE_EMBED,
  METRONOME_EMBED,
  SONG_EMBED,
  type ExerciseEmbedAttrs,
  type MetronomeEmbedAttrs,
  type SongEmbedAttrs,
} from "@/lib/blog/document";

/*
 * Les blocs Ostinara dans l'editeur. Ce sont des « atomes » : un bloc
 * entier, sans texte editable dedans. Leur rendu ici est un apercu ; celui
 * des lecteurs est dans blog-content.tsx (SongEmbed, MetronomeEmbed).
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ostinaraEmbeds: {
      insertSong: (attrs: SongEmbedAttrs) => ReturnType;
      insertMetronome: (attrs: MetronomeEmbedAttrs) => ReturnType;
      insertExercise: (attrs: ExerciseEmbedAttrs) => ReturnType;
    };
  }
}

const shell = "not-prose my-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3";
const removeButton =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground";

function SongView({ node, deleteNode }: ReactNodeViewProps) {
  const t = useTranslations("blog.editor");
  const attrs = node.attrs as SongEmbedAttrs;
  return (
    <NodeViewWrapper className={shell} data-drag-handle="">
      <Cover src={attrs.coverUrl} className="h-12 w-12 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">{t("songBlock")}</p>
        <p className="truncate text-sm font-semibold">{attrs.title}</p>
        <p className="truncate text-xs text-muted-foreground">{attrs.artist}</p>
      </div>
      <button type="button" onClick={deleteNode} aria-label={t("removeBlock")} className={removeButton}>
        <Trash2 className="h-4 w-4" />
      </button>
    </NodeViewWrapper>
  );
}

function ExerciseView({ node, deleteNode }: ReactNodeViewProps) {
  const t = useTranslations("blog.editor");
  const attrs = node.attrs as ExerciseEmbedAttrs;
  return (
    <NodeViewWrapper className={shell} data-drag-handle="">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
        <Dumbbell className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">{t("exerciseBlock")}</p>
        <p className="truncate text-sm font-semibold">{attrs.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {attrs.startingBpm} → {attrs.targetBpm} BPM · {attrs.timeSignature}
        </p>
      </div>
      <button type="button" onClick={deleteNode} aria-label={t("removeBlock")} className={removeButton}>
        <Trash2 className="h-4 w-4" />
      </button>
    </NodeViewWrapper>
  );
}

function MetronomeView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const t = useTranslations("blog.editor");
  const attrs = node.attrs as MetronomeEmbedAttrs;
  const input = "w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums";
  return (
    <NodeViewWrapper className={shell} data-drag-handle="">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">{t("metronomeBlock")}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="number"
              min={30}
              max={300}
              value={attrs.bpm}
              onChange={(e) => updateAttributes({ bpm: Number(e.target.value) })}
              className={input}
            />
            BPM
          </label>
          <label className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={12}
              value={attrs.beats}
              onChange={(e) => updateAttributes({ beats: Number(e.target.value) })}
              className={input}
            />
            {t("beatsPerBar")}
          </label>
        </div>
      </div>
      <button type="button" onClick={deleteNode} aria-label={t("removeBlock")} className={removeButton}>
        <Trash2 className="h-4 w-4" />
      </button>
    </NodeViewWrapper>
  );
}

export const SongEmbedNode = Node.create({
  name: SONG_EMBED,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      deezerId: { default: null },
      title: { default: "" },
      artist: { default: "" },
      album: { default: null },
      coverUrl: { default: null },
      previewUrl: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${SONG_EMBED}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": SONG_EMBED })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SongView);
  },

  addCommands() {
    return {
      insertSong:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const MetronomeEmbedNode = Node.create({
  name: METRONOME_EMBED,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      bpm: { default: 80 },
      beats: { default: 4 },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${METRONOME_EMBED}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": METRONOME_EMBED })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MetronomeView);
  },

  addCommands() {
    return {
      insertMetronome:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const ExerciseEmbedNode = Node.create({
  name: EXERCISE_EMBED,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      exerciseId: { default: "" },
      name: { default: "" },
      nameEn: { default: null },
      description: { default: null },
      descriptionEn: { default: null },
      category: { default: "" },
      difficulty: { default: "" },
      startingBpm: { default: 60 },
      targetBpm: { default: 120 },
      timeSignature: { default: "4/4" },
      instruments: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${EXERCISE_EMBED}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": EXERCISE_EMBED })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExerciseView);
  },

  addCommands() {
    return {
      insertExercise:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

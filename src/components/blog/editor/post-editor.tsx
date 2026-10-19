"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Dumbbell,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Music,
  Quote,
  Redo2,
  Timer,
  Undo2,
} from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { EMPTY_DOCUMENT, slugify } from "@/lib/blog/document";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { LOCALES, type Locale } from "@/i18n/config";
import { deleteBlogPost, saveBlogPost } from "@/lib/actions/blog";
import { ExerciseEmbedNode, MetronomeEmbedNode, SongEmbedNode } from "./embed-nodes";
import { ExercisePicker } from "./exercise-picker";
import { SongPicker } from "./song-picker";
import { uploadBlogImage } from "./upload-image";
import type { BlogCategory, BlogPost, Instrument } from "@/types";

interface Props {
  post: BlogPost | null;
  userId: string;
  defaultLocale: Locale;
  /** Articles d'autres langues dont celui-ci peut etre la traduction. */
  translatable: { id: string; title: string; translation_group: string; locale: Locale }[];
  canDelete: boolean;
}

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const label = "block space-y-1.5";
const labelText = "text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground";

/** Delai sans frappe avant la sauvegarde automatique d'un brouillon. */
const AUTOSAVE_DELAY_MS = 4000;

/** "2026-10-19T14:30" (heure locale) pour un <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        active ? "bg-foreground text-background" : "hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * L'editeur d'article de l'equipe : le texte (Tiptap) et ses reglages
 * (rubrique, instruments, langue, traduction, couverture, publication).
 *
 * Un article s'enregistre en brouillon autant qu'on veut ; « Publier » le
 * met en ligne tout de suite, ou a la date choisie (programme). Une fois en
 * ligne, son adresse ne change plus.
 *
 * Un brouillon s'enregistre aussi tout seul, quelques secondes apres la
 * derniere modification. Jamais un article en ligne ou programme : la
 * sauvegarde auto le repasserait en brouillon. Ceux-la attendent
 * « Mettre a jour ».
 */
export function PostEditor({ post, userId, defaultLocale, translatable, canDelete }: Props) {
  const t = useTranslations("blog.editor");
  const te = useTranslations("enums");
  const router = useRouter();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(post?.cover_url ?? null);
  const [category, setCategory] = useState<BlogCategory>(post?.category ?? "learning");
  const [instruments, setInstruments] = useState<Instrument[]>(post?.instruments ?? []);
  const [locale, setLocale] = useState<Locale>(post?.locale ?? defaultLocale);
  // Le groupe de traduction choisi ; null tant qu'on n'y touche pas
  const linkedGroup = post
    ? translatable.find((item) => item.id !== post.id && item.translation_group === post.translation_group)
        ?.translation_group ?? ""
    : "";
  const [translationGroup, setTranslationGroup] = useState<string>(linkedGroup);
  const [translationTouched, setTranslationTouched] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(
    post?.published_at && new Date(post.published_at) > new Date() ? toLocalInput(post.published_at) : ""
  );
  const [postId, setPostId] = useState<string | null>(post?.id ?? null);
  const [publication, setPublication] = useState({
    status: post?.status ?? "draft",
    publishedAt: post?.published_at ?? null,
  });
  const [dirty, setDirty] = useState(false);
  // Chaque modification incremente la revision : la sauvegarde auto repart
  // de zero, et une sauvegarde ne « nettoie » que ce qu'elle a envoye.
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const imageInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const isLive =
    publication.status === "published" &&
    publication.publishedAt !== null &&
    new Date(publication.publishedAt) <= new Date();
  const isScheduled = publication.status === "published" && !isLive;

  function markDirty() {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setDirty(true);
  }

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Image,
      Placeholder.configure({ placeholder: t("bodyPlaceholder") }),
      SongEmbedNode,
      MetronomeEmbedNode,
      ExerciseEmbedNode,
    ],
    content: (post?.content as object) ?? EMPTY_DOCUMENT,
    editorProps: { attributes: { class: "blog-prose" } },
    onUpdate: () => markDirty(),
  });

  // Ne pas perdre un texte non enregistre en quittant la page
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function touch<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      markDirty();
    };
  }

  function changeTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
    markDirty();
  }

  async function insertImage(file: File, ed: Editor) {
    setMessage(null);
    const result = await uploadBlogImage(file, userId);
    if ("error" in result) {
      setMessage({ kind: "error", text: t(`imageError.${result.error}`) });
      return;
    }
    ed.chain().focus().setImage({ src: result.url, alt: "" }).run();
  }

  async function changeCover(file: File) {
    setMessage(null);
    const result = await uploadBlogImage(file, userId);
    if ("error" in result) {
      setMessage({ kind: "error", text: t(`imageError.${result.error}`) });
      return;
    }
    setCoverUrl(result.url);
    markDirty();
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
    setLinkUrl("");
  }

  async function persist(mode: "draft" | "publish", auto: boolean): Promise<boolean> {
    if (!editor || savingRef.current) return false;
    savingRef.current = true;
    const sentRevision = revisionRef.current;
    try {
      const result = await saveBlogPost({
        id: postId ?? undefined,
        title,
        slug,
        excerpt,
        coverUrl,
        category,
        instruments,
        locale,
        translationGroup: translationTouched ? translationGroup : undefined,
        content: editor.getJSON(),
        mode,
        publishedAt: mode === "publish" && scheduleAt ? new Date(scheduleAt).toISOString() : null,
      });
      if (!result.success) {
        // La sauvegarde auto se tait (elle reessaiera a la frappe suivante),
        // sauf si rien n'a jamais ete enregistre : on le dit.
        if (!auto || !postId) setMessage({ kind: "error", text: result.error ?? t("saveFailed") });
        return false;
      }
      // Ce qui a ete tape pendant l'envoi reste a enregistrer
      if (revisionRef.current === sentRevision) setDirty(false);
      setSlug(result.slug!);
      setPublication({ status: result.status!, publishedAt: result.published_at ?? null });
      if (!postId) {
        setPostId(result.id!);
        // L'adresse de l'article, sans recharger l'editeur (curseur, historique)
        window.history.replaceState(null, "", `/commu/blog/ecrire/${result.id}`);
      }
      return true;
    } finally {
      savingRef.current = false;
    }
  }

  function save(mode: "draft" | "publish") {
    setMessage(null);
    startTransition(async () => {
      const ok = await persist(mode, false);
      if (!ok) return;
      setAutoSavedAt(null);
      setMessage({
        kind: "ok",
        text: mode === "draft" ? t("savedDraft") : scheduleAt ? t("scheduled") : t("published"),
      });
    });
  }

  // Sauvegarde auto des brouillons (et des nouveaux articles, des qu'ils
  // ont un titre)
  const canAutosave = publication.status === "draft" && title.trim().length > 0;
  useEffect(() => {
    if (!dirty || !canAutosave) return;
    const timer = setTimeout(async () => {
      if (await persist("draft", true)) setAutoSavedAt(new Date());
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // persist lit l'etat courant : on ne relance le minuteur qu'a chaque revision
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, dirty, canAutosave]);

  function remove() {
    if (!postId) return;
    // Deux temps : le premier clic demande confirmation
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteBlogPost(postId);
      if (!result.success) {
        setMessage({ kind: "error", text: result.error ?? t("saveFailed") });
        return;
      }
      setDirty(false);
      router.push("/commu/blog");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/commu/blog" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← {t("back")}
        </Link>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {dirty
            ? t(canAutosave ? "autosavePending" : "unsaved")
            : autoSavedAt
              ? t("autosaved", { time: autoSavedAt })
              : postId
                ? t(isLive ? "statusLive" : isScheduled ? "statusScheduled" : "statusDraft")
                : ""}
        </span>
      </div>

      {/* Couverture */}
      <div>
        {coverUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="aspect-[16/9] w-full rounded-2xl bg-muted object-cover" />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button type="button" onClick={() => coverInput.current?.click()} className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-bold">
                {t("changeCover")}
              </button>
              <button type="button" onClick={() => touch(setCoverUrl)(null)} className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-bold">
                {t("removeCover")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="flex aspect-[16/6] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground hover:bg-accent/50"
          >
            <ImagePlus className="h-5 w-5" />
            {t("addCover")}
          </button>
        )}
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) changeCover(file);
            e.target.value = "";
          }}
        />
      </div>

      <textarea
        value={title}
        onChange={(e) => changeTitle(e.target.value.replace(/\n/g, " "))}
        placeholder={t("titlePlaceholder")}
        maxLength={160}
        rows={2}
        className="w-full resize-none bg-transparent font-display text-4xl font-extrabold uppercase leading-[1.02] outline-none placeholder:text-muted-foreground/60 sm:text-5xl"
      />
      <textarea
        value={excerpt}
        onChange={(e) => touch(setExcerpt)(e.target.value)}
        placeholder={t("excerptPlaceholder")}
        maxLength={300}
        rows={2}
        className="w-full resize-none bg-transparent text-lg text-muted-foreground outline-none placeholder:text-muted-foreground/60"
      />

      {/* Barre d'outils, collee en haut pendant l'ecriture */}
      {editor && (
        <div className="sticky top-0 z-10 -mx-1 border-y border-border bg-background/95 py-1 backdrop-blur">
          <div className="flex gap-0.5 overflow-x-auto px-1">
            <ToolbarButton title={t("tool.bold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.italic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title={t("tool.link")}
              active={editor.isActive("link")}
              onClick={() => {
                setLinkUrl((editor.getAttributes("link").href as string) ?? "");
                setLinkOpen((open) => !open);
              }}
            >
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 w-px shrink-0 bg-border" />
            <ToolbarButton title={t("tool.h2")} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.h3")} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.bulletList")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.orderedList")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.quote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.separator")} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <Minus className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 w-px shrink-0 bg-border" />
            <ToolbarButton title={t("tool.image")} onClick={() => imageInput.current?.click()}>
              <ImagePlus className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.song")} onClick={() => setSongPickerOpen(true)}>
              <Music className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.exercise")} onClick={() => setExercisePickerOpen(true)}>
              <Dumbbell className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.metronome")} onClick={() => editor.chain().focus().insertMetronome({ bpm: 80, beats: 4 }).run()}>
              <Timer className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 w-px shrink-0 bg-border" />
            <ToolbarButton title={t("tool.undo")} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title={t("tool.redo")} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
          {linkOpen && (
            <div className="flex gap-2 px-1 pt-1 pb-1">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                placeholder="https://"
                className={field}
              />
              <button type="button" onClick={applyLink} className="shrink-0 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">
                {t("applyLink")}
              </button>
            </div>
          )}
          <input
            ref={imageInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) insertImage(file, editor);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <EditorContent editor={editor} />

      {/* Reglages de l'article */}
      <section className="space-y-4 rounded-2xl border border-border p-4">
        <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("settings")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            <span className={labelText}>{t("category")}</span>
            <select value={category} onChange={(e) => touch(setCategory)(e.target.value as BlogCategory)} className={field}>
              {BLOG_CATEGORIES.map((value) => (
                <option key={value} value={value}>{te(`blogCategory.${value}`)}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            <span className={labelText}>{t("language")}</span>
            <select value={locale} onChange={(e) => touch(setLocale)(e.target.value as Locale)} className={field}>
              {LOCALES.map((value) => (
                <option key={value} value={value}>{t(`locale.${value}`)}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-1.5">
          <legend className={labelText}>{t("instruments")}</legend>
          <div className="flex flex-wrap gap-2 pt-1.5">
            {INSTRUMENT_VALUES.map((value) => {
              const on = instruments.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    touch(setInstruments)(on ? instruments.filter((i) => i !== value) : [...instruments, value])
                  }
                  className={`min-h-[34px] rounded-full border px-3 text-xs font-bold transition-colors ${
                    on ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"
                  }`}
                >
                  {te(`instrument.${value}`)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{t("instrumentsHint")}</p>
        </fieldset>

        {!isLive && translatable.some((item) => item.id !== postId && item.locale !== locale) && (
          <label className={label}>
            <span className={labelText}>{t("translationOf")}</span>
            <select
              value={translationGroup}
              onChange={(e) => {
                setTranslationTouched(true);
                touch(setTranslationGroup)(e.target.value);
              }}
              className={field}
            >
              <option value="">{t("notATranslation")}</option>
              {translatable
                .filter((item) => item.id !== postId && item.locale !== locale)
                .map((item) => (
                  <option key={item.id} value={item.translation_group}>
                    [{item.locale.toUpperCase()}] {item.title}
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className={label}>
          <span className={labelText}>{t("slug")}</span>
          <input
            value={slug}
            disabled={Boolean(isLive)}
            onChange={(e) => {
              setSlugTouched(true);
              touch(setSlug)(e.target.value);
            }}
            onBlur={() => setSlug(slugify(slug))}
            className={`${field} font-mono disabled:opacity-60`}
          />
          <span className="block text-xs text-muted-foreground">
            {isLive ? t("slugLocked") : `/blog/${slugify(slug) || "…"}`}
          </span>
        </label>

        {!isLive && (
          <label className={label}>
            <span className={labelText}>{t("schedule")}</span>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => touch(setScheduleAt)(e.target.value)}
              className={field}
            />
            <span className="block text-xs text-muted-foreground">{t("scheduleHint")}</span>
          </label>
        )}
      </section>

      {message && (
        <p className={`text-sm ${message.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message.text}
        </p>
      )}

      {/* Actions, collees en bas */}
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 backdrop-blur lg:bottom-4">
        {!isLive && (
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={isPending || !title.trim()}
            className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            {t("saveDraft")}
          </button>
        )}
        <button
          type="button"
          onClick={() => save("publish")}
          disabled={isPending || !title.trim()}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isLive ? t("update") : scheduleAt ? t("schedulePublish") : t("publish")}
        </button>
        {postId && (
          <Link
            href={`/commu/blog/${slug}`}
            className="min-h-[44px] content-center rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t(isLive ? "view" : "preview")}
          </Link>
        )}
        {isLive && (
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={isPending}
            className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            {t("unpublish")}
          </button>
        )}
        {postId && (canDelete || !post) && (
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="ml-auto min-h-[44px] rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            {confirmDelete ? t("confirmDelete") : t("delete")}
          </button>
        )}
      </div>

      {exercisePickerOpen && editor && (
        <ExercisePicker
          onClose={() => setExercisePickerOpen(false)}
          onPick={(exercise) => {
            editor.chain().focus().insertExercise(exercise).run();
            setExercisePickerOpen(false);
          }}
        />
      )}

      {songPickerOpen && editor && (
        <SongPicker
          onClose={() => setSongPickerOpen(false)}
          onPick={(song) => {
            editor.chain().focus().insertSong(song).run();
            setSongPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

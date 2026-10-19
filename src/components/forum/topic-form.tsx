"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleCheck, ImagePlus, X } from "lucide-react";
import { FORUM_CATEGORIES, forumTopicAppHref } from "@/lib/forum";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { LOCALES, type Locale } from "@/i18n/config";
import { uploadPublicImage } from "@/lib/storage/upload-public-image";
import { createForumTopic, findSimilarTopics, updateForumTopic } from "@/lib/actions/forum";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { MentionTextarea } from "./mention-textarea";
import type { ForumCategory, ForumGearSnapshot, ForumTopic, ForumTopicSummary, Instrument } from "@/types";

interface Props {
  /** Absent : nouveau sujet. */
  topic?: ForumTopic;
  userId: string;
  defaultLocale: Locale;
  gear: (ForumGearSnapshot & { id: string })[];
}

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelText = "text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground";

type Similar = Pick<ForumTopicSummary, "id" | "slug" | "title" | "reply_count" | "solved_reply_id">;

/**
 * Lancer (ou modifier) un sujet. Pendant qu'on tape le titre, les sujets
 * proches s'affichent : la reponse existe peut-etre deja. On peut joindre
 * jusqu'a 4 photos et un instrument de son Matos (marque, modele, annee).
 */
export function TopicForm({ topic, userId, defaultLocale, gear }: Props) {
  const t = useTranslations("forum.form");
  const te = useTranslations("enums");
  const router = useRouter();
  const { primary } = useMyInstruments();

  const [title, setTitle] = useState(topic?.title ?? "");
  const [body, setBody] = useState(topic?.body ?? "");
  const [category, setCategory] = useState<ForumCategory | "">(topic?.category ?? "");
  const [instruments, setInstruments] = useState<Instrument[]>(topic?.instruments ?? [primary]);
  const [locale, setLocale] = useState<Locale>(topic?.locale ?? defaultLocale);
  const [images, setImages] = useState<string[]>(topic?.images ?? []);
  const [gearId, setGearId] = useState("");
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const imageInput = useRef<HTMLInputElement>(null);

  // Sujets proches, a la creation seulement
  useEffect(() => {
    if (topic || title.trim().length < 8) return;
    const timer = setTimeout(() => {
      findSimilarTopics(title).then(setSimilar);
    }, 500);
    return () => clearTimeout(timer);
  }, [title, topic]);

  async function addImages(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 4 - images.length)) {
        const result = await uploadPublicImage("forum", file, userId, {
          maxBytes: 8 * 1024 * 1024,
          types: /^image\/(jpeg|png|webp)$/,
        });
        if ("error" in result) {
          setError(t(`imageError.${result.error}`));
          break;
        }
        setImages((list) => [...list, result.url].slice(0, 4));
      }
    } finally {
      setUploading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!category) {
      setError(t("categoryRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const input = { title, body, category, locale, instruments, images };
      if (topic) {
        const result = await updateForumTopic(topic.id, input);
        if (!result.success) return setError(result.error ?? null);
        router.push(forumTopicAppHref(topic.slug));
      } else {
        const result = await createForumTopic({ ...input, gearId: gearId || null });
        if (!result.success) return setError(result.error ?? null);
        router.push(forumTopicAppHref(result.slug!));
      }
    });
  }

  const gearHint = category === "gear_buying" || category === "setup_repair";

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <Link
        href={topic ? forumTopicAppHref(topic.slug) : "/commu/forum"}
        className="inline-flex min-h-[36px] items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← {t(topic ? "backToTopic" : "back")}
      </Link>
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none">
        {t(topic ? "editTitle" : "newTitle")}
      </h1>

      <label className="block space-y-1.5">
        <span className={labelText}>{t("category")}</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as ForumCategory)} className={field} required>
          <option value="" disabled>{t("chooseCategory")}</option>
          {FORUM_CATEGORIES.map((value) => (
            <option key={value} value={value}>{te(`forumCategory.${value}`)}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className={labelText}>{t("title")}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          required
          placeholder={t("titlePlaceholder")}
          className={field}
        />
      </label>

      {similar.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary p-3">
          <p className="mb-1.5 text-xs font-bold">{t("similar")}</p>
          <ul className="space-y-1">
            {similar.map((item) => (
              <li key={item.id}>
                <Link
                  href={forumTopicAppHref(item.slug)}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {item.solved_reply_id && <CircleCheck className="h-3.5 w-3.5 shrink-0" />}
                  {item.title}
                  <span className="text-xs text-muted-foreground">({t("replyCount", { count: item.reply_count })})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className={labelText}>{t("body")}</span>
        <MentionTextarea
          value={body}
          onChange={setBody}
          rows={10}
          maxLength={10000}
          required
          placeholder={t(gearHint ? "bodyPlaceholderGear" : "bodyPlaceholder")}
          className={field}
        />
        <span className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("bodyHint")}</span>
          <span className="shrink-0">{body.trim().length} / 10000</span>
        </span>
      </label>

      <fieldset className="space-y-1.5">
        <legend className={labelText}>{t("instruments")}</legend>
        <div className="flex flex-wrap gap-2 pt-1.5">
          {INSTRUMENT_VALUES.map((value) => {
            const selected = instruments.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setInstruments(selected ? instruments.filter((i) => i !== value) : [...instruments, value])}
                className={`min-h-[34px] rounded-full border px-3 text-xs font-bold transition-colors ${
                  selected ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"
                }`}
              >
                {te(`instrument.${value}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Photos */}
      <div className="space-y-1.5">
        <span className={labelText}>{t("photos")}</span>
        <div className="grid grid-cols-4 gap-2">
          {images.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full rounded-xl bg-muted object-cover" />
              <button
                type="button"
                onClick={() => setImages((list) => list.filter((u) => u !== url))}
                aria-label={t("removePhoto")}
                className="absolute top-1 right-1 rounded-full bg-background/90 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < 4 && (
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={uploading}
              aria-label={t("addPhoto")}
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:bg-accent/50 disabled:opacity-60"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
        <input
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addImages(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">{t("photosHint")}</p>
      </div>

      {/* Un instrument du Matos */}
      {!topic && gear.length > 0 && (
        <label className="block space-y-1.5">
          <span className={labelText}>{t("gear")}</span>
          <select value={gearId} onChange={(e) => setGearId(e.target.value)} className={field}>
            <option value="">{t("noGear")}</option>
            {gear.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brand} {item.model}{item.year ? ` (${item.year})` : ""}
              </option>
            ))}
          </select>
          <span className="block text-xs text-muted-foreground">{t("gearHint")}</span>
        </label>
      )}

      <label className="block space-y-1.5">
        <span className={labelText}>{t("language")}</span>
        <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className={field}>
          {LOCALES.map((value) => (
            <option key={value} value={value}>{t(`locale.${value}`)}</option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending || uploading}
        className="min-h-[48px] w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {t(topic ? "save" : "publish")}
      </button>
      <p className="text-center text-xs text-muted-foreground">{t("rules")}</p>
    </form>
  );
}

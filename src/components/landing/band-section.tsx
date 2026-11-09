import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Frets } from "@/components/ui/frets";

/*
 * Le groupe sur les pages publiques (accueil et acces anticipe), a egalite
 * avec la pratique seule. Les fragments reprennent l'app plutot qu'une
 * illustration : le tableau « Prets pour la repete » d'une setlist de groupe
 * (setlist-member-readiness-panel), avec des donnees d'exemple.
 */

type Readiness = "ready" | "learning" | "toLearn";

const members = ["L", "M", "A", "J"] as const;

const setlist: { title: string; parts: Readiness[] }[] = [
  { title: "Paranoid", parts: ["ready", "ready", "ready", "ready"] },
  { title: "Black Hole Sun", parts: ["ready", "learning", "ready", "ready"] },
  { title: "Seven Nation Army", parts: ["ready", "ready", "ready", "ready"] },
  { title: "Song 2", parts: ["ready", "toLearn", "ready", "ready"] },
];

const readinessShade: Record<Readiness, string> = {
  ready: "bg-primary",
  learning: "bg-primary/40",
  toLearn: "bg-muted",
};

/* Un musicien est pret quand toute la setlist est prete sur son poste. */
const readyMembers = members.filter((_, i) => setlist.every((song) => song.parts[i] === "ready"));

const steps = [
  { key: "repertoire", icon: "library_music" },
  { key: "poll", icon: "calendar_month" },
  { key: "ready", icon: "check_circle" },
  { key: "jam", icon: "metronome" },
  { key: "recordings", icon: "mic" },
  { key: "concerts", icon: "event" },
] as const;

/** La section Groupe : le cycle d'un groupe, de la date de repete au concert. */
export function BandSection() {
  const t = useTranslations("landing.band");
  const accent = (chunks: React.ReactNode) => <span className="text-primary">{chunks}</span>;

  return (
    <section id="groupe" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Icon name="groups" className="h-4 w-4" />
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
            {t.rich("title", { accent })}
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{t("lead")}</p>

          <ul className="mt-10 grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
            {steps.map((step) => (
              <li key={step.key} className="flex items-start gap-3 border-b border-border py-4">
                <Icon name={step.icon} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-display text-xl font-extrabold uppercase leading-none">{t(`steps.${step.key}.name`)}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`steps.${step.key}.detail`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true" className="border-y border-border py-6 lg:mt-14">
          <ReadinessFragment />
        </div>
      </div>
    </section>
  );
}

/* Le tableau « Prets pour la repete » : morceaux en lignes, musiciens en colonnes. */
function ReadinessFragment() {
  const t = useTranslations("landing.band.fragment");
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("title")}
        </p>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">{t("when")}</p>
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="pb-2" />
            {members.map((member) => (
              <th key={member} className="w-9 pb-2">
                <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-foreground font-display text-sm font-extrabold text-background">
                  {member}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {setlist.map((song) => (
            <tr key={song.title} className="border-t border-border">
              <td className="truncate py-2.5 pr-3 font-bold">{song.title}</td>
              {song.parts.map((part, i) => (
                <td key={i} className="py-2.5">
                  <span className={`mx-auto block h-3.5 w-3.5 rounded-[3px] ${readinessShade[part]}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(readinessShade) as Readiness[]).map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-[2px] ${readinessShade[status]}`} />
              {t(`status.${status}`)}
            </li>
          ))}
        </ul>
        <p className="tabular font-display text-2xl font-extrabold leading-none">
          {readyMembers.length}
          <span className="text-sm text-muted-foreground">/{members.length} {t("readyShort")}</span>
        </p>
      </div>
    </div>
  );
}

/*
 * L'apercu du hero, en deux moities egales : ce que tu tiens seul (le tempo
 * d'un morceau, comme dans le Carnet) et ou en est ton groupe pour la
 * prochaine repete.
 */
export function HeroFragment({ className = "" }: { className?: string }) {
  const t = useTranslations("landing");
  return (
    <figure aria-hidden="true" className={`grid border-y border-border sm:grid-cols-2 lg:grid-cols-1 ${className}`}>
      <div className="py-6 sm:pr-6 lg:pr-0">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("early.hero.you")} · {t("early.hero.tempoHeld")}
        </p>
        <p className="tabular mt-2 font-display text-[96px] font-extrabold leading-[0.85]">
          92<span className="text-4xl text-muted-foreground">/104</span>
        </p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
            {t("early.hero.bpmSong")}
          </span>
          <Frets value={73} className="origin-right scale-150" />
        </div>
      </div>

      <div className="border-t border-border py-6 sm:border-l sm:border-t-0 sm:pl-6 lg:border-l-0 lg:border-t lg:pl-0">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("band.fragment.title")} · {t("band.fragment.when")}
        </p>
        <p className="tabular mt-2 font-display text-[96px] font-extrabold leading-[0.85]">
          {readyMembers.length}
          <span className="text-4xl text-muted-foreground">/{members.length}</span>
        </p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
            {t("band.fragment.ready", { ready: readyMembers.length, total: members.length })}
          </span>
          <span className="flex gap-1.5">
            {members.map((member) => (
              <span
                key={member}
                className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-extrabold ${
                  readyMembers.includes(member) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {member}
              </span>
            ))}
          </span>
        </div>
      </div>
    </figure>
  );
}

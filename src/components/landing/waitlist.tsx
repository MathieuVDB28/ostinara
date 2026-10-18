"use client";

import { createContext, useContext, useState, useTransition } from "react";
import Link from "next/link";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { EARLY_BIRD, isEarlyBird, offeredPlan } from "@/lib/waitlist";
import { PLANS } from "@/lib/stripe/config";
import { INSTRUMENTS } from "@/lib/instruments";
import { Icon } from "@/components/ui/icon";
import type { Instrument, UserPlan } from "@/types";

/*
 * La liste d'attente de la page d'accueil. Deux formulaires (le hero et
 * l'appel final) et les boutons de la grille de tarifs partagent le meme
 * etat : choisir « Band » dans les tarifs le preselectionne dans le
 * formulaire, et une inscription faite en haut se lit aussi en bas.
 */

interface WaitlistState {
  plan: UserPlan;
  setPlan: (plan: UserPlan) => void;
  instruments: Instrument[];
  toggleInstrument: (instrument: Instrument) => void;
  joined: Joined | null;
  setJoined: (joined: Joined) => void;
}

interface Joined {
  email: string;
  /** Absent si l'adresse etait deja sur la liste. */
  rank?: number;
  /** Faux tant que l'envoi d'emails n'est pas configure. */
  confirmationSent?: boolean;
}

const WaitlistContext = createContext<WaitlistState | null>(null);

function useWaitlist() {
  const context = useContext(WaitlistContext);
  if (!context) throw new Error("useWaitlist doit être utilisé dans WaitlistProvider");
  return context;
}

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<UserPlan>("pro");
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [joined, setJoined] = useState<Joined | null>(null);

  const toggleInstrument = (instrument: Instrument) =>
    setInstruments((current) =>
      current.includes(instrument) ? current.filter((i) => i !== instrument) : [...current, instrument],
    );

  return (
    <WaitlistContext.Provider value={{ plan, setPlan, instruments, toggleInstrument, joined, setJoined }}>
      {children}
    </WaitlistContext.Provider>
  );
}

const PLAN_OPTIONS: { value: UserPlan; label: string; price: string }[] = [
  { value: "free", label: "Free", price: "0€" },
  { value: "pro", label: "Pro", price: "9€/mois" },
  { value: "band", label: "Band", price: "19€/mois" },
];

/** D'ou vient le visiteur, pour savoir quelle communaute repond. */
function readSource(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("ref") ?? params.get("utm_source");
}

interface WaitlistFormProps {
  /** Distingue les deux formulaires de la page pour les labels. */
  id: string;
}

export function WaitlistForm({ id }: WaitlistFormProps) {
  const { plan, setPlan, instruments, toggleInstrument, joined, setJoined } = useWaitlist();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (instruments.length === 0) {
      setError("Dis-nous de quoi tu joues.");
      return;
    }
    startTransition(async () => {
      const result = await joinWaitlist({ email, plan, instruments, website, source: readSource() });
      if (result.success) {
        setJoined({ email: email.trim(), rank: result.rank, confirmationSent: result.confirmationSent });
      } else {
        setError(result.error ?? "Oups, ça n'est pas passé.");
      }
    });
  };

  if (joined) return <WaitlistSuccess {...joined} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-xl">
      <fieldset className="mb-4">
        <legend className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Tu joues de quoi&nbsp;?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INSTRUMENTS.map((option) => {
            const selected = instruments.includes(option.value);
            return (
              <label
                key={option.value}
                className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-card hover:bg-accent"
                }`}
              >
                <input
                  type="checkbox"
                  name={`${id}-instruments`}
                  value={option.value}
                  checked={selected}
                  onChange={() => toggleInstrument(option.value)}
                  className="sr-only"
                />
                <Icon name={option.icon} className="h-4 w-4" />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Le plan qui t&apos;intéresse
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-input bg-input">
          {PLAN_OPTIONS.map((option) => {
            const selected = plan === option.value;
            return (
              <label
                key={option.value}
                className={`flex min-h-[56px] cursor-pointer flex-col items-center justify-center px-2 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring ${
                  selected ? "bg-foreground text-background" : "bg-card hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-plan`}
                  value={option.value}
                  checked={selected}
                  onChange={() => setPlan(option.value)}
                  className="sr-only"
                />
                <span className="font-display text-xl font-extrabold uppercase leading-none">
                  {option.label}
                </span>
                <span
                  className={`tabular mt-1 text-xs font-semibold ${
                    selected ? "text-background/70" : "text-muted-foreground"
                  }`}
                >
                  {option.price}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label htmlFor={`${id}-email`} className="sr-only">
        Ton adresse email
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="ton@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-[52px] flex-1 rounded-xl border border-input bg-card px-4 text-base placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Icon name="progress_activity" className="h-5 w-5 animate-spin" />
              Envoi…
            </>
          ) : (
            <>
              Je veux mon accès
              <Icon name="arrow_forward" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>

      {/* Piege a robots : hors ecran, ignore des lecteurs d'ecran. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Aucun paiement aujourd&apos;hui. On t&apos;écrit seulement au sujet de ton accès —{" "}
        <Link href="/politique-confidentialite" className="underline underline-offset-2 hover:text-foreground">
          confidentialité
        </Link>
        .
      </p>
    </form>
  );
}

function WaitlistSuccess({ email, rank, confirmationSent }: Joined) {
  const { plan } = useWaitlist();
  const [copied, setCopied] = useState(false);

  // Le bouche-a-oreille entre musiciens : partager a son groupe en un geste.
  const handleShare = async () => {
    const url = `${window.location.origin}/acces-anticipe`;
    const shareData = {
      title: "Ostinara",
      text: "L'app pour suivre sa progression en musique, seul ou en groupe — je viens de rejoindre l'accès anticipé :",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Partage annule par l'utilisateur : rien a faire.
    }
  };

  return (
    <div role="status" className="w-full max-w-xl border-y border-border py-6">
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-success">
        <Icon name="check_circle" className="mr-1.5 inline h-4 w-4 align-[-3px]" />
        Inscription enregistrée
      </p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="font-display text-5xl font-extrabold uppercase leading-[0.9]">C&apos;est noté.</p>
        {rank && (
          <p className="tabular font-display text-5xl font-extrabold leading-[0.9]">
            <span className="text-2xl text-muted-foreground">n°</span>
            {rank}
          </p>
        )}
      </div>
      {isEarlyBird(rank) && (
        <p className="mt-4 border-l-2 border-primary pl-3 text-sm font-semibold leading-relaxed">
          Tu fais partie des {EARLY_BIRD.spots} premiers : {EARLY_BIRD.months} mois de{" "}
          {PLANS[offeredPlan(plan)].name} offerts à l&apos;ouverture de ton accès.
        </p>
      )}
      <p className="mt-3 font-serif text-lg italic leading-relaxed text-foreground/80">
        {/* Sans rang, l'adresse etait deja inscrite : aucun email n'est reparti. */}
        {confirmationSent ? "Confirmation envoyée à " : "On t'écrit à "}
        <span className="not-italic font-semibold">{email}</span>
        {confirmationSent ? ". On t'écrit" : ""} dès que ta place est prête. En attendant, fais tourner à ton
        groupe.
      </p>
      <button
        type="button"
        onClick={handleShare}
        className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-border px-5 text-sm font-bold transition-colors hover:bg-accent"
      >
        <Icon name={copied ? "check" : "send"} className="h-4 w-4" />
        {copied ? "Lien copié" : "Partager Ostinara"}
      </button>
    </div>
  );
}

interface PickPlanButtonProps {
  plan: UserPlan;
  /** Le seul aplat ambre de la grille de tarifs. */
  primary?: boolean;
}

/** Bouton des tarifs : preselectionne le plan et remonte au formulaire. */
export function PickPlanButton({ plan, primary = false }: PickPlanButtonProps) {
  const { setPlan, joined } = useWaitlist();

  const handleClick = () => {
    setPlan(plan);
    document.getElementById("acces")?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Le focus suit le defilement, pour enchainer au clavier.
    document.getElementById("final-email")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={Boolean(joined)}
      className={`min-h-[46px] w-full rounded-xl px-4 text-sm font-bold transition-opacity disabled:opacity-50 ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "border border-border hover:bg-accent"
      }`}
    >
      {joined ? "Tu es sur la liste" : "Je veux ce plan"}
    </button>
  );
}

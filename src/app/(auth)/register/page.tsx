"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signup } from "@/lib/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <Mail className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Vérifie ta boîte mail</h1>
        <p className="text-muted-foreground">
          Un email de confirmation t&apos;a été envoyé. Clique sur le lien pour activer ton compte.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-foreground underline underline-offset-2"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">Créer un compte</h1>
        <p className="mt-2 text-muted-foreground">
          Rejoins la communauté des guitaristes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Nom d&apos;utilisateur
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            placeholder="guitar_hero"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="toi@exemple.com"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Visibilité du compte</label>
          <div className="flex items-center justify-between rounded-xl border border-input bg-background p-4">
            <div className="flex-1">
              <div className="font-medium text-sm">
                {isPrivate ? "Compte privé" : "Compte public"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isPrivate
                  ? "Seuls tes amis voient tes morceaux et favoris"
                  : "Tout le monde peut voir ton profil"
                }
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                isPrivate ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPrivate ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <input type="hidden" name="is_private" value={isPrivate.toString()} />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-foreground underline underline-offset-2">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

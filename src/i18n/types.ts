import type { useTranslations } from "next-intl";

type Namespace = NonNullable<Parameters<typeof useTranslations>[0]>;

/**
 * Le type d'une fonction t() limitee a un namespace, pour les helpers qui
 * fabriquent un libelle hors composant (instruments, statuts, dates
 * relatives…) : le composant leur passe son t(), qu'il vienne de
 * useTranslations (client) ou de getTranslations (serveur).
 */
export type Translator<N extends Namespace> = ReturnType<typeof useTranslations<N>>;

export type EnumsT = Translator<"enums">;
export type CommonT = Translator<"common">;

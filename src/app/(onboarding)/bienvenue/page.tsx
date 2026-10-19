import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMyInstrumentLimit, getMyInstruments } from "@/lib/actions/instruments";
import { WelcomeInstruments } from "./welcome-instruments";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("meta.welcome");
  return { title: t("title") };
}

export default async function BienvenuePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  // Deja choisi : rien a faire ici, les reglages servent a changer.
  const instruments = await getMyInstruments();
  if (instruments.length > 0) redirect("/accueil");

  return <WelcomeInstruments limit={await getMyInstrumentLimit()} />;
}

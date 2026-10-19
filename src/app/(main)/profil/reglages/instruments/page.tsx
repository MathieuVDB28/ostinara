import { getMyInstrumentLimit, getMyInstruments } from "@/lib/actions/instruments";
import { InstrumentsSettings } from "./instruments-settings";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("meta.instruments");
  return { title: t("title") };
}

export default async function InstrumentsSettingsPage() {
  const [instruments, limit] = await Promise.all([getMyInstruments(), getMyInstrumentLimit()]);
  return <InstrumentsSettings initial={instruments} limit={limit} />;
}

import { getMyInstrumentLimit, getMyInstruments } from "@/lib/actions/instruments";
import { InstrumentsSettings } from "./instruments-settings";

export const metadata = {
  title: "Mes instruments | Ostinara",
};

export default async function InstrumentsSettingsPage() {
  const [instruments, limit] = await Promise.all([getMyInstruments(), getMyInstrumentLimit()]);
  return <InstrumentsSettings initial={instruments} limit={limit} />;
}

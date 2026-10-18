import { getMyInstruments } from "@/lib/actions/instruments";
import { InstrumentsSettings } from "./instruments-settings";

export const metadata = {
  title: "Mes instruments | Ostinara",
};

export default async function InstrumentsSettingsPage() {
  const instruments = await getMyInstruments();
  return <InstrumentsSettings initial={instruments} />;
}

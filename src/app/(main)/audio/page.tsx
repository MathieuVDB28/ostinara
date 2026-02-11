import { requirePaidPlan } from "@/lib/actions/spotify";
import { AudioView } from "@/components/audio/audio-view";
import { ProUpsell } from "@/components/subscription/pro-upsell";

export const metadata = {
  title: "Reconnaissance Audio | Ostinara",
  description: "Identifie des morceaux et accorde ta guitare",
};

export default async function AudioPage() {
  const planCheck = await requirePaidPlan();

  if (!planCheck.allowed) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Reconnaissance Audio</h1>
        <ProUpsell
          feature="Reconnaissance audio"
          description="Identifie n'importe quel morceau en quelques secondes et accorde ta guitare avec précision. Disponible avec les plans Pro et Band."
        />
      </div>
    );
  }

  return <AudioView />;
}

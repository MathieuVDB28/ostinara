import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** L'horloge commune des jams : chaque appareil mesure son ecart avec elle. */
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}

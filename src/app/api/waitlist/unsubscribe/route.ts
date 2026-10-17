import { NextRequest, NextResponse } from "next/server";
import { leaveWaitlist } from "@/lib/actions/waitlist";

/**
 * Desinscription en un clic (RFC 8058) : Gmail et Apple Mail envoient un
 * POST sur l'URL de l'en-tete List-Unsubscribe. Le lien visible dans
 * l'email, lui, mene a /acces-anticipe/desinscription, qui demande de
 * confirmer : les antivirus de messagerie suivent les liens en GET, un
 * GET ne doit donc rien supprimer.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const { success } = await leaveWaitlist(token);
  return NextResponse.json({ success }, { status: success ? 200 : 404 });
}

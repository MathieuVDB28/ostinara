import { tErr } from "@/i18n/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSongsterrTabStructure, extractSongsterrId } from "@/lib/services/songsterr";

export async function GET(request: NextRequest) {
  const songsterrId = request.nextUrl.searchParams.get("songsterrId");
  const tabsUrl = request.nextUrl.searchParams.get("url");

  // Either get the ID directly or extract it from URL
  let id: number | null = null;
  if (songsterrId) {
    id = parseInt(songsterrId, 10);
  } else if (tabsUrl) {
    id = extractSongsterrId(tabsUrl);
  }

  if (!id || isNaN(id)) {
    return NextResponse.json(
      { error: "songsterrId ou url Songsterr requis" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: await tErr("notAuthenticated") }, { status: 401 });
  }

  // Check plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return NextResponse.json(
      { error: await tErr("proOnly") },
      { status: 403 }
    );
  }

  const structure = await fetchSongsterrTabStructure(id);

  if (!structure) {
    return NextResponse.json(
      { error: await tErr("tabParseFailed") },
      { status: 404 }
    );
  }

  return NextResponse.json({ structure });
}

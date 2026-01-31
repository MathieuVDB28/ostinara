import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (error) {
    return NextResponse.redirect(`${appUrl}/profile/edit?spotify=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/profile/edit?spotify=error&reason=missing_params`);
  }

  // Verify state cookie (CSRF)
  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify_oauth_state")?.value;
  cookieStore.delete("spotify_oauth_state");

  if (state !== storedState) {
    return NextResponse.redirect(`${appUrl}/profile/edit?spotify=error&reason=state_mismatch`);
  }

  // Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/profile/edit?spotify=error&reason=not_authenticated`);
  }

  // Exchange code for tokens
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${appUrl}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/profile/edit?spotify=error&reason=config`);
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${appUrl}/profile/edit?spotify=error&reason=token_exchange`);
  }

  const tokenData = await tokenResponse.json();

  // Get Spotify user profile
  const meResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  let spotifyUserId: string | null = null;
  if (meResponse.ok) {
    const meData = await meResponse.json();
    spotifyUserId = meData.id;
  }

  // Store tokens via service role client
  const adminSupabase = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await adminSupabase
    .from("profiles")
    .update({
      spotify_access_token: tokenData.access_token,
      spotify_refresh_token: tokenData.refresh_token,
      spotify_token_expires_at: expiresAt,
      spotify_user_id: spotifyUserId,
      spotify_connected_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.redirect(`${appUrl}/profile/edit?spotify=connected`);
}

import { NextRequest, NextResponse } from 'next/server';
import { searchTracks, formatTrackForSong, searchAlbums } from '@/lib/services/deezer';
import { createClient } from '@/lib/supabase/server';

/**
 * La recherche du catalogue musical (Deezer), pour les ecrans client.
 * `type=album` rend des albums entiers, sinon des morceaux prets pour la biblio.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (type === 'album') {
    return NextResponse.json(await searchAlbums(query));
  }
  const tracks = await searchTracks(query);
  return NextResponse.json(tracks.map(formatTrackForSong));
}

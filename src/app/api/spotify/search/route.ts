import { NextRequest, NextResponse } from 'next/server';
import { searchTracks, formatTrackForSong, searchAlbums, formatAlbumForFavorite } from '@/lib/services/spotify';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Vérifier l'authentification
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track'; // Default to track

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    if (type === 'album') {
      const albums = await searchAlbums(query);
      const formattedAlbums = albums.map(formatAlbumForFavorite);
      return NextResponse.json(formattedAlbums);
    } else {
      const tracks = await searchTracks(query);
      const formattedTracks = tracks.map(formatTrackForSong);
      return NextResponse.json(formattedTracks);
    }
  } catch (error) {
    console.error('Spotify search error:', error);
    return NextResponse.json(
      { error: `Failed to search ${type}s` },
      { status: 500 }
    );
  }
}

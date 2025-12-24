// Types pour les morceaux
export type SongDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SongStatus = 'want_to_learn' | 'learning' | 'mastered';

export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
  difficulty?: SongDifficulty;
  status: SongStatus;
  progress_percent: number;
  tuning: string;
  capo_position: number;
  tabs_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSongInput {
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
  difficulty?: SongDifficulty;
  status?: SongStatus;
  tuning?: string;
  capo_position?: number;
  tabs_url?: string;
  notes?: string;
}

export interface UpdateSongInput {
  title?: string;
  artist?: string;
  album?: string;
  cover_url?: string;
  difficulty?: SongDifficulty;
  status?: SongStatus;
  progress_percent?: number;
  tuning?: string;
  capo_position?: number;
  tabs_url?: string;
  notes?: string;
}

// Types Spotify
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

// Types pour le profil
export type UserPlan = 'free' | 'pro' | 'band';

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  plan: UserPlan;
  created_at: string;
}

// Types pour les covers
export type CoverVisibility = 'private' | 'friends' | 'public';
export type CoverMediaType = 'video' | 'audio';

export interface Cover {
  id: string;
  user_id: string;
  song_id: string;
  media_url: string;
  media_type: CoverMediaType;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  visibility: CoverVisibility;
  description?: string;
  created_at: string;
}

export interface CoverWithSong extends Cover {
  song: Song;
}

export interface CreateCoverInput {
  song_id: string;
  media_url: string;
  media_type: CoverMediaType;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  visibility?: CoverVisibility;
  description?: string;
}

export interface UpdateCoverInput {
  visibility?: CoverVisibility;
  description?: string;
}

// Types pour les amitiés
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendshipWithProfile extends Friendship {
  requester: Profile;
  addressee: Profile;
}

// Type pour un ami (profil + infos relation)
export interface Friend {
  id: string; // friendship id
  profile: Profile;
  since: string; // created_at de l'amitié
}

// Type pour une demande d'ami entrante
export interface FriendRequest {
  id: string; // friendship id
  requester: Profile;
  created_at: string;
}

// Types pour les activités
export type ActivityType = 'song_added' | 'song_mastered' | 'cover_posted' | 'friend_added';

export interface Activity {
  id: string;
  user_id: string;
  type: ActivityType;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityWithProfile extends Activity {
  user: Profile;
}

export interface ActivityWithDetails extends ActivityWithProfile {
  song?: Song;
  cover?: CoverWithSong;
  friend?: Profile;
}

// Type pour le profil d'un ami avec ses données
export interface FriendProfile {
  profile: Profile;
  songs: Song[];
  covers: CoverWithSong[];
  friendship: Friendship;
  stats: {
    totalSongs: number;
    masteredSongs: number;
    totalCovers: number;
  };
}

// Types pour la recherche d'utilisateurs
export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  friendshipStatus: FriendshipStatus | 'none' | 'self';
}

// Input types pour les activités
export interface CreateActivityInput {
  type: ActivityType;
  reference_id?: string;
  metadata?: Record<string, unknown>;
}

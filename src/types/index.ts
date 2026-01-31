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
  target_bpm?: number;
  spotify_bpm?: number;
  spotify_key?: number;
  spotify_energy?: number;
  spotify_audio_fetched_at?: string;
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
  target_bpm?: number;
}

// Types pour la wishlist
export interface WishlistSong {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
  created_at: string;
}

export interface CreateWishlistSongInput {
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
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

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string; width: number; height: number }[];
  external_urls: {
    spotify: string;
  };
  release_date: string;
  total_tracks: number;
}

export interface SpotifyAlbumSearchResult {
  albums: {
    items: SpotifyAlbum[];
    total: number;
  };
}

// Types pour le profil
export type UserPlan = 'free' | 'pro' | 'band';

// Types pour les abonnements Stripe
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  plan: UserPlan;
  created_at: string;
  bio?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  is_private: boolean;
  updated_at?: string;
  // Stripe subscription fields
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: SubscriptionStatus;
  subscription_period_end?: string;
  // Spotify fields
  spotify_user_id?: string;
  spotify_connected_at?: string;
}

// Types pour les liens sociaux
export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  facebook?: string;
}

// Types pour les favoris
export interface FavoriteSong {
  id: string;
  user_id: string;
  song_id: string;
  position: number;
  created_at: string;
  song: Song;
}

export interface FavoriteAlbum {
  id: string;
  user_id: string;
  album_name: string;
  artist_name: string;
  cover_url?: string;
  spotify_id?: string;
  position: number;
  created_at: string;
}

// Type pour le profil utilisateur complet (propre profil)
export interface UserProfile extends Profile {
  favorite_songs: FavoriteSong[];
  favorite_albums: FavoriteAlbum[];
  stats: {
    totalSongs: number;
    masteredSongs: number;
    totalCovers: number;
    friendsCount: number;
  };
}

// Type pour un profil public (profil d'autres utilisateurs)
export interface PublicProfile {
  profile: Profile;
  favorite_songs: FavoriteSong[] | null;
  favorite_albums: FavoriteAlbum[] | null;
  recent_songs: Song[] | null;
  recent_covers: CoverWithSong[];
  stats: {
    totalSongs: number | null;
    masteredSongs: number | null;
    totalCovers: number;
  };
  friendship_status: FriendshipStatus | 'none' | 'self';
  is_friend: boolean;
}

// Inputs pour mise à jour du profil
export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  is_private?: boolean;
  avatar_url?: string;
}

// Inputs pour gestion des favoris
export interface SetFavoriteSongInput {
  song_id: string;
  position: number; // 1-4
}

export interface SetFavoriteAlbumInput {
  album_name: string;
  artist_name: string;
  cover_url?: string;
  spotify_id?: string;
  position: number; // 1-4
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
export type ActivityType = 'song_added' | 'song_mastered' | 'cover_posted' | 'friend_added' | 'song_wishlisted' | 'setlist_created' | 'band_created' | 'band_joined' | 'challenge_created' | 'challenge_accepted' | 'challenge_completed' | 'challenge_won';

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
  wishlistSong?: WishlistSong;
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

// Types pour les sessions de pratique
export type SessionMood = 'frustrated' | 'neutral' | 'good' | 'great' | 'on_fire';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type SongSection = 'intro' | 'verse' | 'chorus' | 'bridge' | 'solo' | 'outro' | 'full_song';

export interface PracticeSession {
  id: string;
  user_id: string;
  song_id: string | null;
  duration_minutes: number;
  practiced_at: string;
  bpm_achieved: number | null;
  mood: SessionMood | null;
  energy_level: EnergyLevel | null;
  sections_worked: SongSection[];
  session_goals: string | null;
  goals_achieved: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeSessionWithSong extends PracticeSession {
  song: Song | null;
}

export interface CreatePracticeSessionInput {
  song_id?: string;
  duration_minutes: number;
  practiced_at?: string;
  bpm_achieved?: number;
  mood?: SessionMood;
  energy_level?: EnergyLevel;
  sections_worked?: SongSection[];
  session_goals?: string;
  goals_achieved?: boolean;
  notes?: string;
}

export interface UpdatePracticeSessionInput {
  song_id?: string | null;
  duration_minutes?: number;
  practiced_at?: string;
  bpm_achieved?: number | null;
  mood?: SessionMood | null;
  energy_level?: EnergyLevel | null;
  sections_worked?: SongSection[];
  session_goals?: string | null;
  goals_achieved?: boolean;
  notes?: string | null;
}

export interface PracticeStats {
  totalSessions: number;
  totalMinutes: number;
  averageSessionLength: number;
  sessionsThisWeek: number;
  minutesThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  mostPracticedSong: { song: Song; count: number } | null;
}

export interface PracticeSessionFilters {
  songId?: string;
  startDate?: string;
  endDate?: string;
  mood?: SessionMood;
}

export interface SongPracticeStats {
  totalSessions: number;
  totalMinutes: number;
  lastPracticed: string | null;
  averageBpm: number | null;
  bestBpm: number | null;
}

// Types pour les graphiques de progression
export interface HeatmapDay {
  date: string; // Format YYYY-MM-DD
  minutes: number;
  sessions: number;
  level: 0 | 1 | 2 | 3 | 4; // Intensité 0 = rien, 4 = max
}

export interface HeatmapData {
  days: HeatmapDay[];
  maxMinutes: number;
  totalDays: number;
  activeDays: number;
}

export interface BpmProgressPoint {
  date: string;
  bpm: number;
  songTitle: string;
}

export interface BpmProgressData {
  songId: string;
  songTitle: string;
  songArtist: string;
  coverUrl?: string;
  points: BpmProgressPoint[];
  bestBpm: number;
  latestBpm: number;
  improvement: number; // % d'amélioration
}

export interface MoodDistribution {
  mood: SessionMood;
  count: number;
  percentage: number;
  label: string;
  emoji: string;
  color: string;
}

export interface SongPracticeDistribution {
  songId: string;
  songTitle: string;
  songArtist: string;
  coverUrl?: string;
  totalMinutes: number;
  totalSessions: number;
  percentage: number;
}

export interface ChartData {
  heatmap: HeatmapData;
  bpmProgress: BpmProgressData[];
  moodDistribution: MoodDistribution[];
  songDistribution: SongPracticeDistribution[];
}

// Types pour les filtres et tri de la bibliothèque
export type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'title_asc'
  | 'title_desc'
  | 'progress_desc'
  | 'difficulty_asc'
  | 'difficulty_desc';

export interface FilterState {
  difficulties: SongDifficulty[];
  tunings: string[];
  hasCapo: boolean | null;
}

// =============================================
// Types pour les groupes (Bands)
// =============================================
export type BandMemberRole = 'owner' | 'admin' | 'member';
export type BandInvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Band {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BandMember {
  id: string;
  band_id: string;
  user_id: string;
  role: BandMemberRole;
  joined_at: string;
}

export interface BandMemberWithProfile extends BandMember {
  profile: Profile;
}

export interface BandWithMembers extends Band {
  members: BandMemberWithProfile[];
  owner: Profile;
}

export interface BandInvitation {
  id: string;
  band_id: string;
  inviter_id: string;
  invitee_id: string;
  status: BandInvitationStatus;
  created_at: string;
  updated_at: string;
}

export interface BandInvitationWithDetails extends BandInvitation {
  band: Band;
  inviter: Profile;
}

export interface CreateBandInput {
  name: string;
  description?: string;
  cover_url?: string;
}

export interface UpdateBandInput {
  name?: string;
  description?: string;
  cover_url?: string;
}

// =============================================
// Types pour les Setlists
// =============================================
export type SetlistItemType = 'song' | 'section';

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  concert_date?: string;
  venue?: string;
  band_id?: string;
  user_id: string;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetlistItem {
  id: string;
  setlist_id: string;
  position: number;
  item_type: SetlistItemType;

  // Song fields
  song_id?: string;
  song_title?: string;
  song_artist?: string;
  song_cover_url?: string;
  song_owner_id?: string;

  // Section fields
  section_name?: string;

  // Common fields
  notes?: string;
  transition_seconds: number;
  duration_seconds?: number;

  created_at: string;
  updated_at: string;
}

export interface SetlistItemWithSongOwner extends SetlistItem {
  song_owner?: Profile;
}

export interface SetlistWithDetails extends Setlist {
  band?: Band;
  items: SetlistItemWithSongOwner[];
  total_duration_seconds: number;
  song_count: number;
}

export interface CreateSetlistInput {
  name: string;
  description?: string;
  concert_date?: string;
  venue?: string;
  band_id?: string;
  is_personal?: boolean;
}

export interface UpdateSetlistInput {
  name?: string;
  description?: string;
  concert_date?: string;
  venue?: string;
}

export interface CreateSetlistItemInput {
  setlist_id: string;
  position: number;
  item_type: SetlistItemType;

  // For songs
  song_id?: string;
  song_title?: string;
  song_artist?: string;
  song_cover_url?: string;
  song_owner_id?: string;

  // For sections
  section_name?: string;

  notes?: string;
  transition_seconds?: number;
  duration_seconds?: number;
}

export interface UpdateSetlistItemInput {
  position?: number;
  notes?: string;
  transition_seconds?: number;
  duration_seconds?: number;
  section_name?: string;
}

// Predefined section types for setlists
export const SECTION_PRESETS = [
  { name: 'Intro', icon: 'play', color: 'bg-blue-500/20 text-blue-400' },
  { name: 'Pause', icon: 'pause', color: 'bg-yellow-500/20 text-yellow-400' },
  { name: 'Rappel', icon: 'repeat', color: 'bg-purple-500/20 text-purple-400' },
  { name: 'Outro', icon: 'stop', color: 'bg-red-500/20 text-red-400' },
  { name: 'Medley', icon: 'layers', color: 'bg-green-500/20 text-green-400' },
  { name: 'Acoustique', icon: 'guitar', color: 'bg-amber-500/20 text-amber-400' },
] as const;

export type SectionPresetName = typeof SECTION_PRESETS[number]['name'];

// =============================================
// Types pour les Challenges
// =============================================
export type ChallengeType = 'practice_time' | 'streak' | 'song_mastery';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'declined';

export interface Challenge {
  id: string;
  creator_id: string;
  challenger_id: string;
  challenge_type: ChallengeType;
  status: ChallengeStatus;
  duration_days: number;
  starts_at: string | null;
  ends_at: string | null;
  song_id: string | null;
  song_title: string | null;
  song_artist: string | null;
  song_cover_url: string | null;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  practice_minutes: number;
  streak_days: number;
  streak_last_date: string | null;
  song_mastered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithDetails extends Challenge {
  creator: Profile;
  challenger: Profile;
  creator_progress: ChallengeProgress | null;
  challenger_progress: ChallengeProgress | null;
  song?: Song | null;
}

export interface CreateChallengeInput {
  challenger_id: string;
  challenge_type: ChallengeType;
  duration_days: number;
  song_id?: string;
}

// Types pour les Leaderboards
export type LeaderboardPeriod = 'week' | 'month';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_minutes: number;
  sessions_count: number;
  rank: number;
}

// =============================================
// Types pour le Mode Practice et Métronome
// =============================================

// Catégories d'exercices
export type ExerciseCategory =
  | 'scales'        // Gammes
  | 'arpeggios'     // Arpèges
  | 'picking'       // Picking/Strumming
  | 'chord_changes' // Changements d'accords
  | 'fingerstyle'   // Fingerpicking
  | 'technique'     // Technique générale
  | 'rhythm';       // Exercices rythmiques

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  starting_bpm: number;
  target_bpm: number;
  bpm_increment: number;
  time_signature: string;
  instructions: string[];
  tips: string[];
  video_url?: string;
  duration_minutes: number;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserExercise {
  id: string;
  user_id: string;
  exercise_id: string;
  current_bpm: number;
  best_bpm: number;
  total_practice_minutes: number;
  sessions_count: number;
  last_practiced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserExerciseWithExercise extends UserExercise {
  exercise: Exercise;
}

export interface ExerciseWithProgress extends Exercise {
  user_progress?: UserExercise;
}

export interface PracticeSessionExercise {
  id: string;
  practice_session_id: string;
  exercise_id: string;
  duration_minutes: number;
  bpm_achieved?: number;
  created_at: string;
}

export interface CreateUserExerciseProgressInput {
  exercise_id: string;
  current_bpm: number;
  duration_minutes: number;
  bpm_achieved?: number;
}

// Types pour le Métronome
export interface TimeSignature {
  beats: number;      // Numérateur (ex: 4)
  noteValue: number;  // Dénominateur (ex: 4)
}

export type Subdivision = 'none' | 'eighth' | 'triplet' | 'sixteenth';

export interface MetronomeConfig {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  accentPattern: number[];  // Ex: [1, 0, 0, 0] accent sur beat 1
  volume: number;           // 0-1
  silentMode: boolean;
  silentBeats: number[];    // Index des beats silencieux
}

// Signatures temporelles disponibles
export const TIME_SIGNATURES: TimeSignature[] = [
  { beats: 4, noteValue: 4 },   // 4/4 - Standard
  { beats: 3, noteValue: 4 },   // 3/4 - Valse
  { beats: 6, noteValue: 8 },   // 6/8 - Compound duple
  { beats: 2, noteValue: 4 },   // 2/4 - March
  { beats: 5, noteValue: 4 },   // 5/4 - Odd meter
  { beats: 7, noteValue: 8 },   // 7/8 - Balkans
  { beats: 12, noteValue: 8 },  // 12/8 - Blues shuffle
];

// Labels pour les catégories d'exercices
export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  scales: 'Gammes',
  arpeggios: 'Arpèges',
  picking: 'Picking',
  chord_changes: 'Accords',
  fingerstyle: 'Fingerstyle',
  technique: 'Technique',
  rhythm: 'Rythme',
};

// Labels pour les subdivisions
export const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  none: 'Aucune',
  eighth: 'Croches',
  triplet: 'Triolets',
  sixteenth: 'Doubles croches',
};

// =============================================
// Types pour les Jam Sessions
// =============================================
export type JamSessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

export interface JamSession {
  id: string;
  band_id: string;
  host_id: string;
  setlist_id: string | null;
  status: JamSessionStatus;

  // Metronome state
  bpm: number;
  time_signature_beats: number;
  time_signature_value: number;
  is_metronome_playing: boolean;

  // Current song
  current_song_index: number | null;
  current_song_id: string | null;
  current_song_title: string | null;
  current_song_artist: string | null;

  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JamSessionWithDetails extends JamSession {
  band: BandWithMembers;
  host: Profile;
  setlist?: SetlistWithDetails | null;
  participants: JamSessionParticipantWithProfile[];
}

export interface JamSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
}

export interface JamSessionParticipantWithProfile extends JamSessionParticipant {
  profile: Profile;
}

export interface JamSessionMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface JamSessionMessageWithProfile extends JamSessionMessage {
  profile: Profile;
}

// Realtime Presence state for Jam Session
export interface JamPresenceState {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  online_at: string;
}

// Realtime Broadcast Events
export interface JamMetronomeSyncEvent {
  type: 'metronome_sync';
  bpm: number;
  time_signature_beats: number;
  time_signature_value: number;
  is_playing: boolean;
  start_time?: number;
}

export interface JamSongChangeEvent {
  type: 'song_change';
  song_index: number | null;
  song_id: string | null;
  song_title: string | null;
  song_artist: string | null;
}

export interface CreateJamSessionInput {
  band_id: string;
  setlist_id?: string;
}

// =============================================
// Types pour les Playlists
// =============================================

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
}

export interface PlaylistWithSongs extends Playlist {
  songs: Song[];
  song_count: number;
}

export interface CreatePlaylistInput {
  name: string;
  description?: string;
  cover_url?: string;
}

export interface UpdatePlaylistInput {
  name?: string;
  description?: string;
  cover_url?: string;
}

// =============================================
// Types pour les intégrations Spotify OAuth
// =============================================

export interface SpotifyConnectionStatus {
  connected: boolean;
  spotify_user_id?: string;
  connected_at?: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: { url: string; width: number | null; height: number | null }[];
  tracks: { total: number; href: string };
  owner: { display_name: string; id: string };
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  next: string | null;
}

export interface SpotifyPlaylistTracksResponse {
  items: { track: SpotifyTrack; added_at: string }[];
  total: number;
  next: string | null;
}

export interface SpotifyRecentTrack {
  track: SpotifyTrack;
  played_at: string;
}

export interface SpotifyAudioFeatures {
  id: string;
  tempo: number;
  key: number;
  energy: number;
  mode: number;
  time_signature: number;
}

export interface SongAudioFeatures {
  bpm: number;
  key: string;
  energy: number;
  fetched_at: string;
}

// =============================================
// Types pour la recherche de tablatures
// =============================================

export type TabSourceType = 'songsterr' | 'ultimate_guitar';

export interface TabSource {
  source: TabSourceType;
  title: string;
  artist: string;
  url: string;
  type?: string;
  rating?: number;
}

export interface SongsterrSong {
  id: number;
  title: string;
  artist: { name: string };
}

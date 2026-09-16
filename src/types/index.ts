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
  /* Pont Songsterr : l'analyse de la tab reste sur le morceau, pour que
     l'ouvrir donne la tab, le tempo et les sections sans rien retelecharger. */
  songsterr_id?: number;
  tab_bpm?: number;
  tab_time_signature_beats?: number;
  tab_time_signature_value?: number;
  tab_total_measures?: number;
  tab_sections?: PlayedSection[];
  tab_synced_at?: string;
  created_at: string;
  updated_at: string;
  covers_count?: number;
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
  songsterr_id?: number | null;
  tab_bpm?: number | null;
  tab_time_signature_beats?: number | null;
  tab_time_signature_value?: number | null;
  tab_total_measures?: number | null;
  tab_sections?: PlayedSection[];
  tab_synced_at?: string | null;
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
  artists: { id?: string; name: string }[];
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

export interface SpotifyAlbumDetails {
  id: string;
  name: string;
  album_type: string;
  artists: { id: string; name: string; external_urls: { spotify: string } }[];
  images: { url: string; width: number; height: number }[];
  release_date: string;
  total_tracks: number;
  external_urls: { spotify: string };
  label: string;
  popularity: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres?: string[];
  followers?: { total: number };
  popularity: number;
  external_urls: { spotify: string };
}

export interface AlbumCommunityStats {
  avg_rating: number;
  review_count: number;
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
  favorite_gear: FavoriteGear[];
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
  favorite_gear: FavoriteGear[] | null;
  gear_items: GearItem[] | null;
  recent_songs: Song[] | null;
  recent_covers: CoverWithSong[];
  all_songs: Song[] | null;
  wishlist: WishlistSong[] | null;
  playlists: PlaylistWithSongs[] | null;
  album_reviews: AlbumReview[] | null;
  practice_stats: {
    currentStreak: number;
    totalSessions: number;
    totalMinutes: number;
    minutesThisWeek: number;
  } | null;
  recent_sessions: PracticeSessionWithSong[] | null;
  stats: {
    totalSongs: number | null;
    masteredSongs: number | null;
    totalCovers: number;
    totalAlbumReviews: number;
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
  /** La cover a laquelle celle-ci repond, quand c'en est une. */
  reply_to_cover_id?: string | null;
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
  reply_to_cover_id?: string | null;
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
export type ActivityType = 'song_added' | 'song_mastered' | 'cover_posted' | 'friend_added' | 'song_wishlisted' | 'setlist_created' | 'band_created' | 'band_joined' | 'challenge_created' | 'challenge_accepted' | 'challenge_completed' | 'challenge_won' | 'album_reviewed' | 'exercise_shared' | 'gear_added' | 'album_wishlisted';

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
  albumReview?: AlbumReview;
  albumWishlistItem?: AlbumWishlistItem;
  reactions?: ReactionSummary[];
  commentCount?: number;
  currentUserReactions?: string[];
}

// Types pour les réactions et commentaires d'activités
export interface ActivityReaction {
  id: string;
  activity_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean; // l'utilisateur courant a-t-il réagi avec cet emoji
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ActivityCommentWithProfile extends ActivityComment {
  user: Profile;
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

// Section jouée dans une tab (pour les setlists)
export interface PlayedSection {
  name: string;         // e.g., "Refrain", "Couplet 1", "Solo"
  startMeasure: number; // Mesure de début
  endMeasure: number;   // Mesure de fin
}

export const PLAYED_SECTION_PRESETS = [
  'Intro', 'Couplet 1', 'Couplet 2', 'Couplet 3',
  'Refrain', 'Pre-refrain', 'Post-refrain',
  'Pont', 'Solo', 'Outro', 'Break', 'Riff',
] as const;

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

  // Tabs & sections fields
  tabs_url?: string;
  bpm?: number;
  played_sections?: PlayedSection[];

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
  tabs_url?: string;
  bpm?: number;
  played_sections?: PlayedSection[];
}

export interface UpdateSetlistItemInput {
  position?: number;
  notes?: string;
  transition_seconds?: number;
  duration_seconds?: number;
  section_name?: string;
  tabs_url?: string;
  bpm?: number;
  played_sections?: PlayedSection[];
}

// Predefined section types for setlists
export const SECTION_PRESETS = [
  { name: 'Intro', icon: 'play', color: 'bg-chart-2/20 text-chart-2' },
  { name: 'Pause', icon: 'pause', color: 'bg-muted text-muted-foreground' },
  { name: 'Rappel', icon: 'repeat', color: 'bg-chart-4/20 text-chart-4' },
  { name: 'Outro', icon: 'stop', color: 'bg-chart-1/20 text-chart-1' },
  { name: 'Medley', icon: 'layers', color: 'bg-chart-3/20 text-chart-3' },
  { name: 'Acoustique', icon: 'guitar', color: 'bg-primary/15 text-primary' },
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
  shared_with_friends: boolean;
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
  creator_name?: string;
  is_from_friend?: boolean;
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

export interface CreateExerciseInput {
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
  duration_minutes: number;
  shared_with_friends?: boolean;
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
  band_id: string | null;
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
  band?: BandWithMembers | null;
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

export type TabSourceType = 'songsterr';

export interface TabSource {
  source: TabSourceType;
  title: string;
  artist: string;
  url: string;
  type?: string;
  rating?: number;
  songsterrId?: number;
}

// Structure de tab analysée depuis Songsterr
export interface SongsterrTabStructure {
  bpm: number;
  totalMeasures: number;
  timeSignatureBeats: number;
  timeSignatureValue: number;
  sections: PlayedSection[];
}

// =============================================
// Types pour la reconnaissance audio
// =============================================

export interface AudioIdentificationResult {
  title: string;
  artist: string;
  album?: string;
  release_date?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
}

export interface TuningPreset {
  name: string;
  notes: string[];
  frequencies: number[];
}

export interface PitchDetectionResult {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
}

// =============================================
// Types pour les Album Reviews
// =============================================

export interface AlbumReview {
  id: string;
  user_id: string;
  album_name: string;
  artist_name: string;
  cover_url?: string;
  spotify_id?: string;
  spotify_url?: string;
  release_date?: string;
  total_tracks?: number;
  rating: number; // 0–10 integer stored in DB (stars × 2); display as rating / 2 stars
  review?: string;
  created_at: string;
  updated_at: string;
}

export interface AlbumReviewWithProfile extends AlbumReview {
  user: Profile;
}

export interface CreateAlbumReviewInput {
  album_name: string;
  artist_name: string;
  cover_url?: string;
  spotify_id?: string;
  spotify_url?: string;
  release_date?: string;
  total_tracks?: number;
  rating: number;
  review?: string;
}

export interface UpdateAlbumReviewInput {
  rating?: number;
  review?: string;
}

// Type pour les recommandations Spotify
export interface SpotifyRecommendation {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
  release_date: string;
  total_tracks: number;
}

// =============================================
// Types pour la Wishlist Albums
// =============================================

export interface AlbumWishlistItem {
  id: string;
  user_id: string;
  album_name: string;
  artist_name: string;
  cover_url?: string;
  spotify_id?: string;
  spotify_url?: string;
  release_date?: string;
  total_tracks?: number;
  created_at: string;
}

export interface CreateAlbumWishlistInput {
  album_name: string;
  artist_name: string;
  cover_url?: string;
  spotify_id?: string;
  spotify_url?: string;
  release_date?: string;
  total_tracks?: number;
}

// =============================================
// Types pour les Repetitions (Rehearsals)
// =============================================
export type RehearsalStatus = 'scheduled' | 'cancelled' | 'completed';
export type RehearsalRsvpStatus = 'invited' | 'accepted' | 'declined' | 'maybe';
export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

export interface Rehearsal {
  id: string;
  band_id: string;
  setlist_id: string | null;
  created_by: string;
  title: string;
  description?: string;
  location?: string;
  location_url?: string;
  date: string;
  end_date?: string;
  status: RehearsalStatus;
  recurrence: RecurrenceType;
  recurrence_day_of_week?: number;
  recurrence_end_date?: string;
  parent_rehearsal_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RehearsalParticipant {
  id: string;
  rehearsal_id: string;
  user_id: string;
  status: RehearsalRsvpStatus;
  responded_at?: string;
}

export interface RehearsalParticipantWithProfile extends RehearsalParticipant {
  profile: Profile;
}

export interface RehearsalWithDetails extends Rehearsal {
  band: Band;
  setlist?: Setlist | null;
  participants: RehearsalParticipantWithProfile[];
  creator: Profile;
  message_count?: number;
}

export interface CreateRehearsalInput {
  band_id: string;
  setlist_id?: string;
  title: string;
  description?: string;
  location?: string;
  location_url?: string;
  date: string;
  end_date?: string;
  participant_ids: string[];
  recurrence: RecurrenceType;
  recurrence_end_date?: string;
}

export interface UpdateRehearsalInput {
  title?: string;
  description?: string;
  location?: string;
  location_url?: string;
  date?: string;
  end_date?: string;
  setlist_id?: string | null;
  notes?: string;
  status?: RehearsalStatus;
}

// Labels pour la recurrence
export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Unique',
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
};

// Labels pour le RSVP
export const RSVP_LABELS: Record<RehearsalRsvpStatus, string> = {
  invited: 'En attente',
  accepted: 'Presente',
  declined: 'Absente',
  maybe: 'Peut-etre',
};

export const RSVP_COLORS: Record<RehearsalRsvpStatus, string> = {
  invited: 'bg-muted text-muted-foreground',
  accepted: 'bg-success/15 text-success',
  declined: 'bg-destructive/15 text-destructive',
  maybe: 'bg-primary/15 text-primary',
};

// =============================================
// Types pour la Messagerie de Groupe (Band Chat)
// =============================================
export interface BandMessage {
  id: string;
  band_id: string;
  rehearsal_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
}

export interface BandMessageWithProfile extends BandMessage {
  profile: Profile;
}

// =============================================
// Types pour les Fiches Techniques (Tech Riders)
// =============================================
export interface TechRiderMusician {
  id: string;
  name: string;
  instrument: string;
  needs: string;
  monitor: boolean;
  monitor_notes?: string;
  position_x: number;
  position_y: number;
}

export interface TechRiderChannel {
  id: string;
  number: number;
  source: string;
  musician: string;
  mic_type: string;
  stand_type: string;
  phantom: boolean;
  notes?: string;
}

export interface TechRiderStageElement {
  id: string;
  type: 'monitor' | 'amp' | 'drums' | 'keyboard' | 'di_box' | 'mic_stand' | 'custom';
  label: string;
  x: number;
  y: number;
}

export interface TechRider {
  id: string;
  band_id: string;
  sound_engineer_name?: string;
  sound_engineer_phone?: string;
  musicians: TechRiderMusician[];
  channels: TechRiderChannel[];
  stage_elements: TechRiderStageElement[];
  general_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SaveTechRiderInput {
  sound_engineer_name?: string;
  sound_engineer_phone?: string;
  musicians: TechRiderMusician[];
  channels: TechRiderChannel[];
  stage_elements: TechRiderStageElement[];
  general_notes?: string;
}

// =============================================
// Types pour le Matériel (Gear Library)
// =============================================
export type GearType = 'guitar' | 'bass' | 'amp' | 'effect' | 'accessory' | 'recording' | 'other';
export type GearCondition = 'mint' | 'excellent' | 'good' | 'fair' | 'poor';
export type GearVisibility = 'private' | 'friends' | 'public';
export type GearPriority = 'low' | 'medium' | 'high';

export interface GearItem {
  id: string;
  user_id: string;
  type: GearType;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  serial_number?: string;
  condition?: GearCondition;
  purchase_price?: number;
  purchase_date?: string;
  image_url?: string;
  notes?: string;
  is_active: boolean;
  visibility: GearVisibility;
  created_at: string;
  updated_at: string;
}

export interface CreateGearItemInput {
  type: GearType;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  serial_number?: string;
  condition?: GearCondition;
  purchase_price?: number;
  purchase_date?: string;
  image_url?: string;
  notes?: string;
  is_active?: boolean;
  visibility?: GearVisibility;
}

export interface UpdateGearItemInput {
  type?: GearType;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  serial_number?: string;
  condition?: GearCondition;
  purchase_price?: number;
  purchase_date?: string;
  image_url?: string;
  notes?: string;
  is_active?: boolean;
  visibility?: GearVisibility;
}

// Gear Setups (combinaisons de matériel)
export interface GearSetup {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GearSetupItem {
  id: string;
  setup_id: string;
  gear_id: string;
  position: number;
  role?: string;
  created_at: string;
}

export interface GearSetupItemWithGear extends GearSetupItem {
  gear: GearItem;
}

export interface GearSetupWithItems extends GearSetup {
  items: GearSetupItemWithGear[];
}

export interface CreateGearSetupInput {
  name: string;
  description?: string;
  cover_url?: string;
}

export interface UpdateGearSetupInput {
  name?: string;
  description?: string;
  cover_url?: string;
}

// Gear Wishlist
export interface GearWishlistItem {
  id: string;
  user_id: string;
  type: GearType;
  brand: string;
  model: string;
  estimated_price?: number;
  image_url?: string;
  url?: string;
  notes?: string;
  priority: GearPriority;
  created_at: string;
}

export interface CreateGearWishlistItemInput {
  type: GearType;
  brand: string;
  model: string;
  estimated_price?: number;
  image_url?: string;
  url?: string;
  notes?: string;
  priority?: GearPriority;
}

// Gear Favoris (profil, 4 max)
export interface FavoriteGear {
  id: string;
  user_id: string;
  gear_id: string;
  position: number;
  created_at: string;
  gear: GearItem;
}

export interface SetFavoriteGearInput {
  gear_id: string;
  position: number; // 1-4
}

// Gear taggé sur une cover
export interface CoverGear {
  id: string;
  cover_id: string;
  gear_id: string;
  created_at: string;
  gear: GearItem;
}

// Labels pour les types de matériel
export const GEAR_TYPE_LABELS: Record<GearType, string> = {
  guitar: 'Guitare',
  bass: 'Basse',
  amp: 'Ampli',
  effect: 'Pédale',
  accessory: 'Accessoire',
  recording: 'Enregistrement',
  other: 'Autre',
};

export const GEAR_TYPE_ICONS: Record<GearType, string> = {
  guitar: 'guitar',
  bass: 'bass',
  amp: 'amp',
  effect: 'effect',
  accessory: 'tune',
  recording: 'mic',
  other: 'more_horiz',
};

export const GEAR_CONDITION_LABELS: Record<GearCondition, string> = {
  mint: 'Neuf',
  excellent: 'Excellent',
  good: 'Bon',
  fair: 'Correct',
  poor: 'Usé',
};

export const GEAR_CONDITION_COLORS: Record<GearCondition, string> = {
  mint: 'bg-success/15 text-success',
  excellent: 'bg-chart-2/20 text-chart-2',
  good: 'bg-primary/15 text-primary',
  fair: 'bg-chart-1/20 text-chart-1',
  poor: 'bg-destructive/15 text-destructive',
};

export const GEAR_PRIORITY_LABELS: Record<GearPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

export const GEAR_PRIORITY_COLORS: Record<GearPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/15 text-primary',
  high: 'bg-destructive/15 text-destructive',
};

// Marques courantes pour l'autocomplétion
export const GEAR_BRANDS: Record<GearType, string[]> = {
  guitar: ['Fender', 'Gibson', 'PRS', 'Ibanez', 'Epiphone', 'Squier', 'Taylor', 'Martin', 'Yamaha', 'Gretsch', 'ESP', 'Jackson', 'Schecter', 'Suhr', 'Music Man', 'Rickenbacker', 'Guild', 'Takamine', 'Godin', 'Charvel', 'EVH', 'Cort', 'Lag', 'Vigier', 'Eastman'],
  bass: ['Fender', 'Music Man', 'Ibanez', 'Yamaha', 'Rickenbacker', 'Warwick', 'Squier', 'Epiphone', 'Gibson', 'Spector', 'Sandberg', 'Dingwall', 'Lakland', 'G&L', 'Cort', 'Sterling'],
  amp: ['Marshall', 'Fender', 'Vox', 'Mesa/Boogie', 'Orange', 'Blackstar', 'Boss', 'Roland', 'Line 6', 'Peavey', 'Hughes & Kettner', 'Kemper', 'Neural DSP', 'Positive Grid', 'Two-Rock', 'Friedman', 'Laney'],
  effect: ['Boss', 'MXR', 'Electro-Harmonix', 'TC Electronic', 'Strymon', 'JHS', 'Walrus Audio', 'Way Huge', 'Dunlop', 'Eventide', 'Chase Bliss', 'EarthQuaker Devices', 'Keeley', 'Wampler', 'Fulltone', 'Line 6', 'Ibanez', 'ProCo', 'Zvex', 'Neural DSP'],
  accessory: ['Ernie Ball', "D'Addario", 'Elixir', 'Dunlop', 'Shubb', 'Kyser', 'Planet Waves', 'Levy\'s', 'Mono', 'SKB', 'Hercules', 'Peterson', 'TC Electronic', 'Snark'],
  recording: ['Focusrite', 'Universal Audio', 'PreSonus', 'Audient', 'MOTU', 'RME', 'Shure', 'Rode', 'Audio-Technica', 'Sennheiser', 'AKG', 'Neumann', 'Beyerdynamic', 'KRK', 'Yamaha', 'Adam Audio', 'JBL'],
  other: [],
};

// ---------------------------------------------------------------------------
// Recherche globale
//
// L'app comptait quatorze champs de recherche locaux et aucun point
// d'entree unique : chercher « Blackbird » supposait de savoir d'avance
// si c'etait un morceau, une cover ou un album. Une seule recherche, un
// seul format de resultat, quel que soit l'ecran d'ou on part.
// ---------------------------------------------------------------------------

export type SearchResultKind =
  | "song"
  | "album"
  | "cover"
  | "gear"
  | "friend"
  | "exercise";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle?: string;
  /** Pochette, photo de matos ou avatar. */
  imageUrl?: string;
  /** Repli quand il n'y a pas d'image — nom Material Symbols. */
  icon: string;
  /** Lien profond : il ouvre la fiche, pas seulement l'ecran. */
  href: string;
}

export interface SearchResultGroup {
  kind: SearchResultKind;
  label: string;
  results: SearchResult[];
}

// ---------------------------------------------------------------------------
// Plan de travail hebdomadaire
//
// L'app sait tres bien dire ce qui a ete joue. Elle ne disait rien de la
// semaine qui vient. Trois objectifs, derives du statut des morceaux, de la
// serie en cours et des sections faibles — et cochables.
// ---------------------------------------------------------------------------

export type WeeklyGoalKind =
  | "tempo"
  | "mastery"
  | "minutes"
  | "days"
  | "section"
  | "cover"
  | "song_start";

export interface WeeklyGoal {
  id: string;
  user_id: string;
  /** Le lundi de la semaine, en YYYY-MM-DD. */
  week_start: string;
  kind: WeeklyGoalKind;
  title: string;
  detail: string | null;
  song_id: string | null;
  target_value: number | null;
  baseline_value: number;
  unit: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
}

/**
 * Un objectif et sa mesure.
 *
 * `current` est recalcule a chaque lecture depuis le journal : cocher est
 * un geste, pas la seule source de verite. Un objectif atteint par la
 * mesure s'affiche atteint meme si personne n'a coche.
 */
export interface WeeklyGoalWithProgress extends WeeklyGoal {
  song: Song | null;
  current: number;
  /** 0 a 100, borne. */
  percent: number;
  /** Mesure atteinte, coche manuelle, ou les deux. */
  done: boolean;
  checked: boolean;
}

export interface WeeklyPlan {
  weekStart: string;
  /** Le dimanche soir, pour l'echeance affichee. */
  weekEnd: string;
  goals: WeeklyGoalWithProgress[];
  /** Objectifs atteints sur le total. */
  completedCount: number;
}

// ---------------------------------------------------------------------------
// Progression au tempo
// ---------------------------------------------------------------------------

/**
 * Ou en est un morceau, mesure en BPM et non en pourcentage saisi a la main.
 *
 * `floor` est le depart du travail lent, `achieved` le meilleur tempo tenu
 * en session, `target` la cible. Le pourcentage n'est qu'une lecture de ces
 * trois valeurs — il n'est jamais saisi.
 */
export interface SongTempoProgress {
  target: number;
  achieved: number;
  floor: number;
  percent: number;
  atTempo: boolean;
  /** D'ou vient la cible : reglee a la main, lue dans la tab, ou Spotify. */
  source: "manual" | "tab" | "spotify";
}

/** Un point de la courbe BPM/temps d'un morceau. */
export interface SongBpmPoint {
  date: string;
  bpm: number;
}

// ---------------------------------------------------------------------------
// Feed de covers
// ---------------------------------------------------------------------------

export interface CoverFeedItem extends CoverWithSong {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "plan">;
  /** L'activite portant reactions et commentaires, quand elle existe. */
  activityId: string | null;
  reactions: ReactionSummary[];
  currentUserReactions: string[];
  commentCount: number;
  /** La cover a laquelle celle-ci repond. */
  replyTo: {
    id: string;
    authorName: string;
    songTitle: string;
    thumbnailUrl?: string;
  } | null;
  replyCount: number;
  isOwn: boolean;
}

// ---------------------------------------------------------------------------
// Hors ligne
// ---------------------------------------------------------------------------

/**
 * Ce qui doit rester lisible au sous-sol : la bibliotheque et le journal.
 * Rien d'autre — un instantane doit tenir dans IndexedDB et se rafraichir
 * en une requete.
 */
export interface OfflineSnapshot {
  generatedAt: string;
  userId: string;
  songs: Song[];
  sessions: PracticeSessionWithSong[];
  stats: PracticeStats;
}

/** Une session enregistree sans reseau, en attente d'envoi. */
export interface QueuedPracticeSession {
  /** Identifiant local : il ne vient pas de la base. */
  localId: string;
  queuedAt: string;
  input: CreatePracticeSessionInput;
  /** Nombre d'envois rates — au-dela, on cesse de reessayer en boucle. */
  attempts: number;
  lastError?: string;
}

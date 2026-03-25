// JTK League Off-Season Types
// Comprehensive type definitions for managing the off-season program

// =============================================================================
// SEASON PHASES
// =============================================================================

export type SeasonPhase = 
  | 'regular_season'      // Normal gameplay
  | 'postseason_sim'      // Simulating remaining games
  | 'awards_voting'       // MVP & Cy Young voting
  | 'questionnaire'       // Off-season questionnaire period
  | 'free_agent_declaration' // Teams declare free agents (before World Series)
  | 'world_series'        // World Series in progress
  | 'claiming_period'     // 48-hour claiming window (after World Series)
  | 'claim_resolution'    // Processing claims by record priority
  | 'draft_prep'          // Preparing for the draft (draft order, eligible players)
  | 'draft'               // Draft in progress
  | 'roster_finalization' // Final roster updates after draft
  | 'spring_training'     // 3 ST games; ST/alternate jerseys; ST/MiLB parks; unlimited approved trades (48h or 3 games)
  | 'pre_season';         // Getting ready for new season (deprecated - kept for compatibility)

export interface SeasonState {
  id: string;
  season_number: number;
  game_version: string;  // e.g., "MLB The Show 25"
  phase: SeasonPhase;
  phase_started_at: string;
  phase_deadline?: string;
  world_series_start?: string;
  world_series_end?: string;
  claiming_deadline?: string;
  notes?: string;
  is_current: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GameVersion {
  id: string;
  version_name: string;      // e.g., "MLB The Show 25"
  short_name: string;        // e.g., "MTS25"
  release_year: number;
  is_current: boolean;
  started_at?: string;
  ended_at?: string;
  total_seasons: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SeasonArchive {
  id: string;
  game_version: string;
  season_number: number;
  champion_team_id?: string;
  champion_team_name?: string;
  champion_user_id?: string;
  champion_user_name?: string;
  mvp_player_name?: string;
  mvp_team?: string;
  cy_young_player_name?: string;
  cy_young_team?: string;
  total_games_played?: number;
  total_teams?: number;
  draft_order?: string[];
  draft_pool?: any[];
  season_started_at?: string;
  season_ended_at?: string;
  archived_at: string;
  archived_by?: string;
  notes?: string;
}

// =============================================================================
// AWARDS VOTING
// =============================================================================

export type AwardType = 'mvp' | 'cy_young';

export interface AwardCandidate {
  id: string;
  season_number: number;
  award_type: AwardType;
  player_name: string;
  team_id: string;
  team_abbreviation: string;
  // Hitter stats (for MVP)
  avg?: number;
  home_runs?: number;
  rbi?: number;
  stolen_bases?: number;
  ops?: number;
  // Pitcher stats (for Cy Young)
  wins?: number;
  era?: number;
  strikeouts?: number;
  whip?: number;
  // Ranking
  rank: number; // 1-5 for top 5
}

export interface AwardVote {
  id: string;
  season_number: number;
  user_id: string;
  team_id: string;
  mvp_vote: string; // player_name voted for
  cy_young_vote: string; // player_name voted for
  submitted_at: string;
}

export interface AwardWinner {
  id: string;
  season_number: number;
  award_type: AwardType;
  player_name: string;
  team_id: string;
  vote_count: number;
  announced_at: string;
}

// =============================================================================
// OFF-SEASON QUESTIONNAIRE
// =============================================================================

export interface QuestionnaireStatus {
  id: string;
  user_id: string;
  season_number: number;
  completed: boolean;
  completed_at?: string;
  // Responses (stored for reference)
  continuing_participation: boolean;
  team_retention_preference: 'keep' | 'switch' | 'open';
  requested_team?: string;
  feedback?: string;
}

// =============================================================================
// FREE AGENT SYSTEM
// =============================================================================

export type PlayerClassification = 'common' | 'bronze' | 'silver' | 'gold' | 'diamond';

// Classification hierarchy for claiming rules
export const CLASSIFICATION_ORDER: PlayerClassification[] = [
  'common',   // 0 - lowest
  'bronze',   // 1
  'silver',   // 2
  'gold',     // 3
  'diamond',  // 4 - highest
];

export const CLASSIFICATION_COLORS: Record<PlayerClassification, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  bronze: { bg: 'bg-amber-700/20', text: 'text-amber-600', border: 'border-amber-700/30' },
  silver: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/30' },
  gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  diamond: { bg: 'bg-cyan-400/20', text: 'text-cyan-300', border: 'border-cyan-400/30' },
};

export interface FreeAgentDeclaration {
  id: string;
  season_number: number;
  declaring_team_id: string;
  declaring_user_id: string;
  declaring_team_name?: string;   // Display name of the declaring team
  declaring_user_name?: string;   // Display name of the user who declared
  // Player info
  player_name: string;
  position: string;
  classification: PlayerClassification;
  overall_rating: number;
  // MLB The Show integration
  player_uuid?: string;        // UUID from MLB The Show API for fetching full stats
  card_img?: string;           // Card image URL
  team_short_name?: string;    // MLB team abbreviation (e.g., NYY, LAD)
  // Locking - once declared, cannot be removed or changed
  is_locked: boolean;          // Always true once submitted
  locked_at?: string;          // Timestamp when locked
  // Status
  declared_at: string;
  is_claimed: boolean;
  claimed_by_team_id?: string;
  claimed_at?: string;
}

export interface FreeAgentClaim {
  id: string;
  season_number: number;
  // Who is claiming
  claiming_team_id: string;
  claiming_user_id: string;
  claiming_team_record?: string; // e.g., "65-97" for priority resolution
  claiming_team_wins?: number;
  // What they want
  target_free_agent_id: string;
  target_player_name: string;
  target_classification: PlayerClassification;
  target_player_uuid?: string;   // UUID from MLB The Show API
  target_card_img?: string;      // Card image URL
  // What they're offering
  offered_player_name: string;
  offered_position: string;
  offered_classification: PlayerClassification;
  offered_overall_rating: number;
  offered_player_uuid?: string;  // UUID from MLB The Show API
  offered_card_img?: string;     // Card image URL
  // Status
  status: 'pending' | 'approved' | 'denied' | 'processed';
  submitted_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

// =============================================================================
// STANDINGS & PLAYOFFS
// =============================================================================

export interface FinalStanding {
  id: string;
  season_number: number;
  team_id: string;
  team_name: string;
  team_abbreviation: string;
  // Record
  wins: number;
  losses: number;
  win_percentage: number;
  games_back: number;
  // Division/League
  division: string;
  division_rank: number;
  league_rank: number;
  overall_rank: number;
  // Playoff status
  made_playoffs: boolean;
  playoff_seed?: number;
  // Recorded
  recorded_at: string;
}

export interface PlayoffBracket {
  id: string;
  season_number: number;
  round: 'wild_card' | 'division' | 'championship' | 'world_series';
  game_number: number;
  // Teams
  home_team_id: string;
  home_team_seed: number;
  away_team_id: string;
  away_team_seed: number;
  // Result
  home_score?: number;
  away_score?: number;
  winner_team_id?: string;
  completed: boolean;
  completed_at?: string;
}

// =============================================================================
// WINTER LEAGUE (for non-playoff teams)
// =============================================================================

export interface WinterLeagueTeam {
  id: string;
  season_number: number;
  team_id: string;
  user_id: string;
  // Stats during winter league
  wins: number;
  losses: number;
  games_played: number;
  // Engagement tracking
  is_active: boolean;
  last_game_at?: string;
}

export interface WinterLeagueGame {
  id: string;
  season_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_team_id: string;
  played_at: string;
  reported_by: string;
}

// =============================================================================
// OFF-SEASON CHECKLIST
// =============================================================================

export interface OffseasonTask {
  id: string;
  title: string;
  description: string;
  phase: SeasonPhase;
  required: boolean;
  deadline_type: 'fixed' | 'relative_to_phase' | 'none';
  deadline_hours?: number; // hours from phase start
  action_type: 'form' | 'link' | 'in_app' | 'info';
  action_url?: string;
  action_label?: string;
  icon?: string;
}

export interface UserTaskCompletion {
  id: string;
  user_id: string;
  season_number: number;
  task_id: string;
  completed: boolean;
  completed_at?: string;
  verified_by?: string; // commissioner who verified
  notes?: string;
}

// =============================================================================
// OFFSEASON PROGRESS TRACKING
// =============================================================================

export interface OffseasonProgress {
  user_id: string;
  team_id: string;
  team_name: string;
  season_number: number;
  // Task completion
  questionnaire_completed: boolean;
  free_agents_declared: number;
  claims_submitted: number;
  claims_successful: number;
  // Voting
  awards_voted: boolean;
  // Overall
  all_required_complete: boolean;
  completion_percentage: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a claim is valid based on classification rules
 * To claim a player, you must offer a player of equal or higher classification
 */
export function isValidClaim(
  targetClassification: PlayerClassification,
  offeredClassification: PlayerClassification
): boolean {
  const targetIndex = CLASSIFICATION_ORDER.indexOf(targetClassification);
  const offeredIndex = CLASSIFICATION_ORDER.indexOf(offeredClassification);
  return offeredIndex >= targetIndex;
}

/**
 * Get all classifications that can be claimed with a given offer
 */
export function getClaimableClassifications(
  offeredClassification: PlayerClassification
): PlayerClassification[] {
  const offeredIndex = CLASSIFICATION_ORDER.indexOf(offeredClassification);
  return CLASSIFICATION_ORDER.slice(0, offeredIndex + 1);
}

/**
 * Get the display label for a phase
 */
export function getPhaseLabel(phase: SeasonPhase): string {
  const labels: Record<SeasonPhase, string> = {
    regular_season: 'Regular Season',
    postseason_sim: 'Postseason Simulation',
    awards_voting: 'Awards Voting',
    questionnaire: 'Off-Season Questionnaire',
    free_agent_declaration: 'Free Agent Declaration',
    world_series: 'World Series',
    claiming_period: 'Claiming Period',
    claim_resolution: 'Claim Resolution',
    draft_prep: 'Draft Preparation',
    draft: 'Draft',
    roster_finalization: 'Roster Finalization',
    spring_training: 'Spring Training',
    pre_season: 'Pre-Season',
  };
  return labels[phase];
}

/**
 * Get phase description
 */
export function getPhaseDescription(phase: SeasonPhase): string {
  const descriptions: Record<SeasonPhase, string> = {
    regular_season: 'The regular season is in progress. Play your games!',
    postseason_sim: 'Simulating remaining games to determine final standings.',
    awards_voting: 'Vote for MVP and Cy Young award winners.',
    questionnaire: 'Complete the off-season questionnaire within 24 hours.',
    free_agent_declaration: 'Declare your free agents before the World Series begins.',
    world_series: 'The World Series is in progress. Non-playoff teams: Winter League is open!',
    claiming_period: '48-hour window to submit free agent claims.',
    claim_resolution: 'Processing claims. Priority goes to teams with worst records.',
    draft_prep: 'Draft order is set. Prepare your draft strategy!',
    draft: 'The draft is in progress!',
    roster_finalization: 'Final roster adjustments after the draft. Make any last changes.',
    spring_training:
      'Three ST games; spring training or alternate jerseys; ST or minor league parks. Unlimited approved trades until 3 games or 48 hours, whichever first.',
    pre_season: 'Get ready for the new season!',
  };
  return descriptions[phase];
}

// =============================================================================
// DEFAULT OFFSEASON TASKS
// =============================================================================

export const DEFAULT_OFFSEASON_TASKS: OffseasonTask[] = [
  {
    id: 'task-questionnaire',
    title: 'Complete Off-Season Questionnaire',
    description: 'Confirm your participation for next season, team preferences, and provide feedback.',
    phase: 'questionnaire',
    required: true,
    deadline_type: 'relative_to_phase',
    deadline_hours: 24,
    action_type: 'form',
    action_url: 'https://cvssm5u81xr.typeform.com/to/h5M6A1yn',
    action_label: 'Fill Out Questionnaire',
    icon: 'clipboard-list',
  },
  {
    id: 'task-awards-vote',
    title: 'Vote for MVP & Cy Young',
    description: 'Cast your votes for the top hitter and pitcher of the season.',
    phase: 'awards_voting',
    required: true,
    deadline_type: 'relative_to_phase',
    deadline_hours: 48,
    action_type: 'in_app',
    action_label: 'Vote Now',
    icon: 'trophy',
  },
  {
    id: 'task-declare-fa',
    title: 'Declare Free Agents',
    description: 'You must declare at least one player as a free agent before the World Series.',
    phase: 'free_agent_declaration',
    required: true,
    deadline_type: 'fixed',
    action_type: 'in_app',
    action_label: 'Declare Players',
    icon: 'user-minus',
  },
  {
    id: 'task-submit-claims',
    title: 'Submit Free Agent Claims',
    description: 'Browse available free agents and submit your claims. Remember: equal or higher value required!',
    phase: 'claiming_period',
    required: false,
    deadline_type: 'relative_to_phase',
    deadline_hours: 48,
    action_type: 'in_app',
    action_label: 'Browse & Claim',
    icon: 'user-plus',
  },
  {
    id: 'task-draft-prep',
    title: 'Prepare for the Draft',
    description: 'Review available players and plan your draft strategy.',
    phase: 'draft_prep',
    required: false,
    deadline_type: 'none',
    action_type: 'in_app',
    action_label: 'View Draft Board',
    icon: 'clipboard',
  },
];

// Typeform URL for the questionnaire
export const OFFSEASON_QUESTIONNAIRE_URL = 'https://cvssm5u81xr.typeform.com/to/h5M6A1yn';

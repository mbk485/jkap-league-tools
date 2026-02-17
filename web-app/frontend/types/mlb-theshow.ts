/**
 * MLB The Show Integration Types
 * 
 * Types for player database, rosters, simulation, and exhibition games
 */

// =============================================================================
// ROSTER TYPES
// =============================================================================

export type RosterPosition = 
  | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH'  // Hitters
  | 'SP1' | 'SP2' | 'SP3' | 'SP4' | 'SP5'  // Starting Pitchers
  | 'CP'  // Closer
  | 'BENCH' | 'RP';  // Arrays

export interface RosterSlot {
  playerUuid: string | null;
  playerName?: string;
  playerOvr?: number;
  playerPosition?: string;
  playerImg?: string;
}

export interface UserRoster {
  id: string;
  userId: string;
  name: string;
  lineup: {
    // Hitters
    C: string | null;
    '1B': string | null;
    '2B': string | null;
    '3B': string | null;
    SS: string | null;
    LF: string | null;
    CF: string | null;
    RF: string | null;
    DH: string | null;
    BENCH: string[];
    // Pitchers
    SP1: string | null;
    SP2: string | null;
    SP3: string | null;
    SP4: string | null;
    SP5: string | null;
    RP: string[];
    CP: string | null;
  };
  totalOvr: number;
  totalPlayers: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// WATCHLIST TYPES
// =============================================================================

export interface WatchlistPlayer {
  id: string;
  userId: string;
  playerUuid: string;
  playerName: string;
  playerTeam: string;
  playerOvr: number;
  addedAt: string;
  lastOvrAtAdd: number;
  notifyOnChange: boolean;
}

export interface PlayerUpdateNotification {
  id: string;
  userId: string;
  playerUuid: string;
  playerName: string;
  oldOvr: number;
  newOvr: number;
  changeDirection: 'buff' | 'nerf' | 'unchanged';
  attributeChanges: {
    attribute: string;
    oldValue: number;
    newValue: number;
  }[];
  isRead: boolean;
  createdAt: string;
}

// =============================================================================
// SIMULATION TYPES
// =============================================================================

export type AtBatResult = 
  | 'strikeout' 
  | 'walk' 
  | 'single' 
  | 'double' 
  | 'triple' 
  | 'homerun' 
  | 'groundout' 
  | 'flyout' 
  | 'lineout'
  | 'sacrifice_fly'
  | 'sacrifice_bunt'
  | 'hit_by_pitch'
  | 'error';

export interface PlayByPlayEvent {
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  bases: [boolean, boolean, boolean]; // 1st, 2nd, 3rd
  batter: {
    uuid: string;
    name: string;
    team: string;
  };
  pitcher: {
    uuid: string;
    name: string;
    team: string;
  };
  result: AtBatResult;
  description: string;
  runsScored: number;
  rbiOnPlay: number;
  scoreAfter: {
    away: number;
    home: number;
  };
}

export interface InningScore {
  away: number;
  home: number;
}

export interface BoxScoreBattingLine {
  playerUuid: string;
  playerName: string;
  position: string;
  atBats: number;
  runs: number;
  hits: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  avg: string; // For display
  homeRuns: number;
  doubles: number;
  triples: number;
  stolenBases: number;
}

export interface BoxScorePitchingLine {
  playerUuid: string;
  playerName: string;
  inningsPitched: string; // "6.2" format
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  pitchCount: number;
  decision?: 'W' | 'L' | 'S' | 'H' | null;
}

export interface GameBoxScore {
  lineScore: {
    innings: InningScore[];
    final: {
      away: number;
      home: number;
    };
  };
  awayBatting: BoxScoreBattingLine[];
  homeBatting: BoxScoreBattingLine[];
  awayPitching: BoxScorePitchingLine[];
  homePitching: BoxScorePitchingLine[];
  gameHighlights: string[];
}

export interface ExhibitionGame {
  id: string;
  homeUserId: string;
  awayUserId: string | null; // null for CPU
  homeRosterSnapshot: UserRoster;
  awayRosterSnapshot: UserRoster;
  homeScore: number;
  awayScore: number;
  innings: number;
  gameType: 'sim' | 'exhibition' | 'practice';
  playByPlay: PlayByPlayEvent[] | null;
  boxScore: GameBoxScore | null;
  startedAt: string;
  completedAt: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
}

// =============================================================================
// USER SIM STATS
// =============================================================================

export interface UserSimStats {
  userId: string;
  simWins: number;
  simLosses: number;
  simTies: number;
  totalGames: number;
  totalRunsScored: number;
  totalRunsAllowed: number;
  totalHits: number;
  totalHomeRuns: number;
  totalStrikeoutsPitched: number;
  currentStreak: number;
  longestWinStreak: number;
  updatedAt: string;
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

export interface PlayerSearchFilters {
  query?: string;
  team?: string;
  position?: string;
  minOvr?: number;
  maxOvr?: number;
  rarity?: 'Common' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  isHitter?: boolean;
}

export interface PlayerComparisonResult {
  attribute: string;
  player1Value: number;
  player2Value: number;
  difference: number;
  winner: 1 | 2 | 0;
}

// =============================================================================
// ROSTER UPDATE TYPES
// =============================================================================

export interface RosterUpdateChange {
  playerUuid: string;
  playerName: string;
  team: string;
  oldOvr: number;
  newOvr: number;
  direction: 'buff' | 'nerf' | 'unchanged';
  attributeChanges: {
    attribute: string;
    oldValue: number;
    newValue: number;
    change: number;
  }[];
}

export interface RosterUpdate {
  id: number;
  name: string;
  date: string;
  changes: RosterUpdateChange[];
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export type RosterViewMode = 'field' | 'list' | 'cards';

export interface RosterEditorState {
  selectedPosition: RosterPosition | null;
  searchOpen: boolean;
  searchQuery: string;
  isDirty: boolean;
}

export interface SimulationState {
  isRunning: boolean;
  currentInning: number;
  currentHalf: 'top' | 'bottom';
  playSpeed: 'instant' | 'fast' | 'normal' | 'slow';
  isPaused: boolean;
}

// =============================================================================
// ARCADE GAME TYPES
// =============================================================================

export interface PitchRecognitionGame {
  id: string;
  score: number;
  totalPitches: number;
  correctGuesses: number;
  streak: number;
  bestStreak: number;
  pitchHistory: {
    pitchType: string;
    playerGuess: string;
    correct: boolean;
    reactionTimeMs: number;
  }[];
}

export interface TimingTrainerGame {
  id: string;
  score: number;
  totalSwings: number;
  perfectHits: number;
  goodHits: number;
  earlySwings: number;
  lateSwings: number;
  missedSwings: number;
  avgTimingMs: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * ShowZone API Integration
 * 
 * ShowZone (showzone.gg) provides community-driven MLB The Show data including:
 * - True Overall ratings (more accurate than in-game OVR)
 * - Community rankings
 * - Market data
 * - Quirk analysis
 * 
 * API Base: https://showzone.io/api/
 * Player Database: https://showzone.gg/players?format=json
 */

// =============================================================================
// SHOWZONE TYPES
// =============================================================================

export interface ShowZonePlayer {
  card_id: string;
  name: string;
  team: string;
  team_abbr: string;
  rarity: 'Common' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  series: string;
  overall: number;
  true_overall: number; // ShowZone's calculated true rating
  display_position: string;
  secondary_positions: string[];
  bats: 'R' | 'L' | 'S';
  throws: 'R' | 'L';
  
  // Card image URLs
  img: string;
  card_img: string;
  
  // Hitting attributes
  contact_left: number;
  contact_right: number;
  power_left: number;
  power_right: number;
  vision: number;
  discipline: number;
  clutch: number;
  bunting: number;
  drag_bunting: number;
  durability: number;
  
  // Fielding/Speed
  fielding: number;
  arm_strength: number;
  arm_accuracy: number;
  reaction: number;
  blocking: number;
  speed: number;
  baserunning: number;
  aggression: number;
  
  // Pitching (if pitcher)
  stamina: number;
  pitching_clutch: number;
  h_per_9: number;
  k_per_9: number;
  bb_per_9: number;
  hr_per_9: number;
  velocity: number;
  control: number;
  movement: number;
  
  // Pitches array
  pitches: ShowZonePitch[];
  
  // Quirks
  quirks: ShowZoneQuirk[];
  
  // Market data
  buy_price: number;
  sell_price: number;
  
  // Meta
  is_live_series: boolean;
  is_hitter: boolean;
  last_updated: string;
}

export interface ShowZonePitch {
  name: string;
  speed: number;
  control: number;
  break: number;
}

export interface ShowZoneQuirk {
  name: string;
  description: string;
  img?: string;
}

export interface ShowZoneAPIResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShowZonePlayer[];
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

// ShowZone's JSON API endpoint
const SHOWZONE_API_BASE = 'https://showzone.io/api';
const SHOWZONE_PLAYERS_URL = 'https://showzone.gg/players';

// Cache configuration
const CACHE_DURATION_MS = 1000 * 60 * 30; // 30 minutes
const playerCache = new Map<string, { data: ShowZonePlayer; timestamp: number }>();
const searchCache = new Map<string, { data: ShowZonePlayer[]; timestamp: number }>();

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch players from ShowZone with filtering
 */
export async function fetchShowZonePlayers(options: {
  page?: number;
  perPage?: number;
  search?: string;
  team?: string;
  position?: string;
  rarity?: string;
  minOverall?: number;
  maxOverall?: number;
  orderBy?: string;
  liveSeriesOnly?: boolean;
} = {}): Promise<{
  players: ShowZonePlayer[];
  totalCount: number;
  hasMore: boolean;
}> {
  const {
    page = 1,
    perPage = 25,
    search,
    team,
    position,
    rarity,
    minOverall,
    maxOverall,
    orderBy = 'desc playerprofileadvanced__overall_true',
    liveSeriesOnly = true,
  } = options;

  // Build query params
  const params = new URLSearchParams({
    format: 'json',
    page: page.toString(),
    page_size: perPage.toString(),
    order_by: orderBy,
  });

  if (search) params.append('search', search);
  if (team) params.append('team', team);
  if (position) params.append('display_position', position);
  if (rarity) params.append('rarity', rarity);
  if (minOverall) params.append('overall__gte', minOverall.toString());
  if (maxOverall) params.append('overall__lte', maxOverall.toString());
  if (liveSeriesOnly) params.append('series', 'Live');

  const cacheKey = params.toString();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return {
      players: cached.data,
      totalCount: cached.data.length,
      hasMore: true,
    };
  }

  try {
    const response = await fetch(`${SHOWZONE_PLAYERS_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`ShowZone API error: ${response.status}`);
    }

    const data: ShowZoneAPIResponse = await response.json();
    
    // Transform to our format
    const players = data.results || [];
    
    // Cache the results
    searchCache.set(cacheKey, { data: players, timestamp: Date.now() });

    return {
      players,
      totalCount: data.count || players.length,
      hasMore: data.next !== null,
    };
  } catch (error) {
    console.error('ShowZone API error:', error);
    // Return empty on error - we'll fall back to MLB The Show API
    return { players: [], totalCount: 0, hasMore: false };
  }
}

/**
 * Fetch a single player by card ID
 */
export async function fetchShowZonePlayer(cardId: string): Promise<ShowZonePlayer | null> {
  const cached = playerCache.get(cardId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(`${SHOWZONE_API_BASE}/players/${cardId}/`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`ShowZone API error: ${response.status}`);
    }

    const player: ShowZonePlayer = await response.json();
    
    // Cache the result
    playerCache.set(cardId, { data: player, timestamp: Date.now() });

    return player;
  } catch (error) {
    console.error('ShowZone API error:', error);
    return null;
  }
}

/**
 * Search players by name
 */
export async function searchShowZonePlayers(
  query: string,
  options: {
    team?: string;
    position?: string;
    rarity?: string;
    liveSeriesOnly?: boolean;
    limit?: number;
  } = {}
): Promise<ShowZonePlayer[]> {
  const { limit = 25, ...restOptions } = options;
  
  const result = await fetchShowZonePlayers({
    search: query,
    perPage: limit,
    ...restOptions,
  });

  return result.players;
}

/**
 * Get top players by position for free agent suggestions
 */
export async function getTopPlayersByPosition(
  position: string,
  limit: number = 10
): Promise<ShowZonePlayer[]> {
  const result = await fetchShowZonePlayers({
    position,
    perPage: limit,
    liveSeriesOnly: true,
    orderBy: 'desc playerprofileadvanced__overall_true',
  });

  return result.players;
}

/**
 * Get all Diamond players (for MVP/Cy Young candidates)
 */
export async function getDiamondPlayers(options: {
  isHitter?: boolean;
  team?: string;
  limit?: number;
} = {}): Promise<ShowZonePlayer[]> {
  const { isHitter, team, limit = 50 } = options;
  
  const result = await fetchShowZonePlayers({
    rarity: 'Diamond',
    team,
    perPage: limit,
    liveSeriesOnly: true,
    orderBy: 'desc playerprofileadvanced__overall_true',
  });

  // Filter by hitter/pitcher if specified
  if (isHitter !== undefined) {
    return result.players.filter(p => p.is_hitter === isHitter);
  }

  return result.players;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get ShowZone rarity color classes
 */
export function getShowZoneRarityColor(rarity: string): {
  bg: string;
  text: string;
  border: string;
  gradient: string;
} {
  switch (rarity) {
    case 'Diamond':
      return {
        bg: 'bg-cyan-500/20',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        gradient: 'from-cyan-500/20 to-blue-500/10',
      };
    case 'Gold':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        gradient: 'from-yellow-500/20 to-amber-500/10',
      };
    case 'Silver':
      return {
        bg: 'bg-slate-400/20',
        text: 'text-slate-300',
        border: 'border-slate-400/30',
        gradient: 'from-slate-400/20 to-gray-500/10',
      };
    case 'Bronze':
      return {
        bg: 'bg-orange-600/20',
        text: 'text-orange-400',
        border: 'border-orange-600/30',
        gradient: 'from-orange-600/20 to-amber-700/10',
      };
    default: // Common
      return {
        bg: 'bg-zinc-500/20',
        text: 'text-zinc-400',
        border: 'border-zinc-500/30',
        gradient: 'from-zinc-500/20 to-gray-600/10',
      };
  }
}

/**
 * Format player for free agent declaration
 */
export function formatPlayerForDeclaration(player: ShowZonePlayer): {
  player_name: string;
  position: string;
  classification: 'common' | 'bronze' | 'silver' | 'gold' | 'diamond';
  overall_rating: number;
  true_overall: number;
  card_img: string;
} {
  return {
    player_name: player.name,
    position: player.display_position,
    classification: player.rarity.toLowerCase() as any,
    overall_rating: player.overall,
    true_overall: player.true_overall,
    card_img: player.card_img || player.img,
  };
}

/**
 * Get player card image URL
 */
export function getPlayerCardImage(player: ShowZonePlayer): string {
  return player.card_img || player.img || `https://mlb25.theshow.com/rails/active_storage/blobs/${player.card_id}/card.png`;
}

/**
 * Compare two players for trade/claim evaluation
 */
export function comparePlayerValue(player1: ShowZonePlayer, player2: ShowZonePlayer): {
  player1Better: boolean;
  trueDiff: number;
  overallDiff: number;
  raritySame: boolean;
} {
  const rarityOrder = ['Common', 'Bronze', 'Silver', 'Gold', 'Diamond'];
  const rarity1 = rarityOrder.indexOf(player1.rarity);
  const rarity2 = rarityOrder.indexOf(player2.rarity);

  return {
    player1Better: player1.true_overall > player2.true_overall,
    trueDiff: player1.true_overall - player2.true_overall,
    overallDiff: player1.overall - player2.overall,
    raritySame: rarity1 === rarity2,
  };
}

// =============================================================================
// TEAM DATA
// =============================================================================

export const MLB_TEAMS = [
  { abbr: 'ARI', name: 'Arizona Diamondbacks', league: 'NL', division: 'West' },
  { abbr: 'ATL', name: 'Atlanta Braves', league: 'NL', division: 'East' },
  { abbr: 'BAL', name: 'Baltimore Orioles', league: 'AL', division: 'East' },
  { abbr: 'BOS', name: 'Boston Red Sox', league: 'AL', division: 'East' },
  { abbr: 'CHC', name: 'Chicago Cubs', league: 'NL', division: 'Central' },
  { abbr: 'CWS', name: 'Chicago White Sox', league: 'AL', division: 'Central' },
  { abbr: 'CIN', name: 'Cincinnati Reds', league: 'NL', division: 'Central' },
  { abbr: 'CLE', name: 'Cleveland Guardians', league: 'AL', division: 'Central' },
  { abbr: 'COL', name: 'Colorado Rockies', league: 'NL', division: 'West' },
  { abbr: 'DET', name: 'Detroit Tigers', league: 'AL', division: 'Central' },
  { abbr: 'HOU', name: 'Houston Astros', league: 'AL', division: 'West' },
  { abbr: 'KC', name: 'Kansas City Royals', league: 'AL', division: 'Central' },
  { abbr: 'LAA', name: 'Los Angeles Angels', league: 'AL', division: 'West' },
  { abbr: 'LAD', name: 'Los Angeles Dodgers', league: 'NL', division: 'West' },
  { abbr: 'MIA', name: 'Miami Marlins', league: 'NL', division: 'East' },
  { abbr: 'MIL', name: 'Milwaukee Brewers', league: 'NL', division: 'Central' },
  { abbr: 'MIN', name: 'Minnesota Twins', league: 'AL', division: 'Central' },
  { abbr: 'NYM', name: 'New York Mets', league: 'NL', division: 'East' },
  { abbr: 'NYY', name: 'New York Yankees', league: 'AL', division: 'East' },
  { abbr: 'OAK', name: 'Oakland Athletics', league: 'AL', division: 'West' },
  { abbr: 'PHI', name: 'Philadelphia Phillies', league: 'NL', division: 'East' },
  { abbr: 'PIT', name: 'Pittsburgh Pirates', league: 'NL', division: 'Central' },
  { abbr: 'SD', name: 'San Diego Padres', league: 'NL', division: 'West' },
  { abbr: 'SF', name: 'San Francisco Giants', league: 'NL', division: 'West' },
  { abbr: 'SEA', name: 'Seattle Mariners', league: 'AL', division: 'West' },
  { abbr: 'STL', name: 'St. Louis Cardinals', league: 'NL', division: 'Central' },
  { abbr: 'TB', name: 'Tampa Bay Rays', league: 'AL', division: 'East' },
  { abbr: 'TEX', name: 'Texas Rangers', league: 'AL', division: 'West' },
  { abbr: 'TOR', name: 'Toronto Blue Jays', league: 'AL', division: 'East' },
  { abbr: 'WSH', name: 'Washington Nationals', league: 'NL', division: 'East' },
] as const;

export const POSITIONS = [
  'SP', 'RP', 'CP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH',
] as const;

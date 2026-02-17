/**
 * MLB The Show API Integration
 * 
 * Official API: https://mlb25.theshow.com/apis/docs
 * 
 * This module provides access to:
 * - Live Series player database (cards, attributes, pitches)
 * - Roster updates (buff/nerf tracking)
 * - Player search
 * 
 * NOTE: We filter for Live Series only since JKAP is a custom league, not Diamond Dynasty
 */

// =============================================================================
// TYPES
// =============================================================================

export interface MLBTheShowPitch {
  name: string;
  speed: number;
  control: number;
  movement: number;
}

export interface MLBTheShowQuirk {
  name: string;
  description?: string;
}

export interface MLBTheShowPlayer {
  uuid: string;
  type: 'mlb_card';
  img: string;
  baked_img: string;
  sc_baked_img: string | null;
  name: string;
  short_description: string | null;
  rarity: 'Common' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  team: string;
  team_short_name: string;
  ovr: number;
  series: string;
  series_texture_name: string;
  series_year: number;
  display_position: string;
  display_secondary_positions: string;
  jersey_number: string;
  age: number;
  bat_hand: 'R' | 'L' | 'S';
  throw_hand: 'R' | 'L';
  weight: number;
  height: string;
  born: string;
  is_hitter: boolean;
  
  // Hitting attributes (0-125 scale, displayed as 0-99 in game)
  stamina: number;
  pitching_clutch: number;
  hits_per_bf: number;
  k_per_bf: number;
  bb_per_bf: number;
  hr_per_bf: number;
  pitch_velocity: number;
  pitch_control: number;
  pitch_movement: number;
  contact_left: number;
  contact_right: number;
  power_left: number;
  power_right: number;
  plate_vision: number;
  plate_discipline: number;
  batting_clutch: number;
  bunting_ability: number;
  drag_bunting_ability: number;
  hitting_durability: number;
  fielding_durability: number;
  fielding_ability: number;
  arm_strength: number;
  arm_accuracy: number;
  reaction_time: number;
  blocking: number;
  speed: number;
  baserunning_ability: number;
  baserunning_aggression: number;
  
  // Pitch repertoire (for pitchers)
  pitches: MLBTheShowPitch[];
  
  // Quirks
  quirks: MLBTheShowQuirk[];
  
  // Market info (we don't use this for custom leagues, but good to have)
  is_sellable: boolean;
  has_augment: boolean;
  augment_text: string | null;
  augment_end_date: string | null;
  has_matchup: boolean;
  stars: number | null;
  trend: string | null;
  new_rank: number;
  has_rank_change: boolean;
  event: string;
  set_name: string;
  is_live_set: boolean;
  ui_anim_index: number;
  locations: string[];
}

export interface MLBTheShowRosterUpdate {
  id: number;
  name: string;
  date: string;
  players: MLBTheShowRosterUpdatePlayer[];
}

export interface MLBTheShowRosterUpdatePlayer {
  uuid: string;
  name: string;
  team: string;
  old_ovr: number;
  new_ovr: number;
  attribute_changes: AttributeChange[];
}

export interface AttributeChange {
  attribute: string;
  old_value: number;
  new_value: number;
  change: number;
}

export interface PlayerSearchResult {
  uuid: string;
  name: string;
  team: string;
  team_short_name: string;
  ovr: number;
  rarity: string;
  display_position: string;
  img: string;
  baked_img: string;
  is_hitter: boolean;
}

export interface MLBTheShowAPIResponse<T> {
  page: number;
  per_page: number;
  total_pages: number;
  items?: T[];
  listings?: T[];
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

const MLB_THESHOW_API_BASE = 'https://mlb25.theshow.com/apis';

// Cache configuration
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour for player data
const ROSTER_UPDATE_CACHE_MS = 1000 * 60 * 15; // 15 minutes for roster updates

// In-memory cache (will be replaced with Supabase caching later)
const playerCache = new Map<string, { data: MLBTheShowPlayer; timestamp: number }>();
const searchCache = new Map<string, { data: PlayerSearchResult[]; timestamp: number }>();

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch all Live Series players (paginated)
 * We only use Live Series for JKAP custom leagues
 */
export async function fetchLiveSeriesPlayers(page: number = 1): Promise<{
  players: MLBTheShowPlayer[];
  totalPages: number;
  currentPage: number;
}> {
  try {
    const response = await fetch(
      `${MLB_THESHOW_API_BASE}/items.json?type=mlb_card&page=${page}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: MLBTheShowAPIResponse<MLBTheShowPlayer> = await response.json();
    
    // Filter for Live Series only
    const liveSeriesPlayers = (data.items || []).filter(
      player => player.series === 'Live' && player.is_live_set
    );
    
    return {
      players: liveSeriesPlayers,
      totalPages: data.total_pages,
      currentPage: data.page,
    };
  } catch (error) {
    console.error('Failed to fetch Live Series players:', error);
    throw error;
  }
}

/**
 * Fetch a single player by UUID
 */
export async function fetchPlayerByUUID(uuid: string): Promise<MLBTheShowPlayer | null> {
  // Check cache first
  const cached = playerCache.get(uuid);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }
  
  try {
    const response = await fetch(`${MLB_THESHOW_API_BASE}/item.json?uuid=${uuid}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status}`);
    }
    
    const player: MLBTheShowPlayer = await response.json();
    
    // Cache the result
    playerCache.set(uuid, { data: player, timestamp: Date.now() });
    
    return player;
  } catch (error) {
    console.error(`Failed to fetch player ${uuid}:`, error);
    throw error;
  }
}

/**
 * Search players by name (Live Series only)
 */
export async function searchPlayers(
  query: string,
  options: {
    team?: string;
    position?: string;
    minOvr?: number;
    maxOvr?: number;
    rarity?: string;
  } = {}
): Promise<PlayerSearchResult[]> {
  const cacheKey = JSON.stringify({ query, ...options });
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }
  
  try {
    // Build query params
    const params = new URLSearchParams({
      type: 'mlb_card',
    });
    
    // The API doesn't have a direct search, so we fetch and filter client-side
    // For a production app, we'd cache all Live Series players and search locally
    const allPlayers: PlayerSearchResult[] = [];
    let page = 1;
    let hasMore = true;
    
    // Fetch up to 5 pages for search (125 players)
    while (hasMore && page <= 5) {
      const response = await fetch(
        `${MLB_THESHOW_API_BASE}/items.json?type=mlb_card&page=${page}`
      );
      
      if (!response.ok) break;
      
      const data: MLBTheShowAPIResponse<MLBTheShowPlayer> = await response.json();
      
      // Filter for Live Series only
      const filtered = (data.items || [])
        .filter(p => p.series === 'Live' && p.is_live_set)
        .filter(p => {
          // Name search
          if (query && !p.name.toLowerCase().includes(query.toLowerCase())) {
            return false;
          }
          // Team filter
          if (options.team && p.team_short_name !== options.team && p.team !== options.team) {
            return false;
          }
          // Position filter
          if (options.position && p.display_position !== options.position) {
            return false;
          }
          // OVR range
          if (options.minOvr && p.ovr < options.minOvr) return false;
          if (options.maxOvr && p.ovr > options.maxOvr) return false;
          // Rarity
          if (options.rarity && p.rarity !== options.rarity) return false;
          
          return true;
        })
        .map(p => ({
          uuid: p.uuid,
          name: p.name,
          team: p.team,
          team_short_name: p.team_short_name,
          ovr: p.ovr,
          rarity: p.rarity,
          display_position: p.display_position,
          img: p.img,
          baked_img: p.baked_img,
          is_hitter: p.is_hitter,
        }));
      
      allPlayers.push(...filtered);
      
      hasMore = page < data.total_pages;
      page++;
    }
    
    // Sort by OVR descending
    allPlayers.sort((a, b) => b.ovr - a.ovr);
    
    // Cache results
    searchCache.set(cacheKey, { data: allPlayers, timestamp: Date.now() });
    
    return allPlayers;
  } catch (error) {
    console.error('Failed to search players:', error);
    throw error;
  }
}

/**
 * Fetch roster updates (for buff/nerf tracking)
 */
export async function fetchRosterUpdates(page: number = 1): Promise<{
  updates: MLBTheShowRosterUpdate[];
  totalPages: number;
}> {
  try {
    const response = await fetch(
      `${MLB_THESHOW_API_BASE}/roster_updates.json?page=${page}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      updates: data.roster_updates || [],
      totalPages: data.total_pages || 1,
    };
  } catch (error) {
    console.error('Failed to fetch roster updates:', error);
    throw error;
  }
}

/**
 * Fetch a specific roster update by ID
 */
export async function fetchRosterUpdateById(id: number): Promise<MLBTheShowRosterUpdate | null> {
  try {
    const response = await fetch(
      `${MLB_THESHOW_API_BASE}/roster_update.json?id=${id}`
    );
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch roster update ${id}:`, error);
    throw error;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get rarity color class for UI
 */
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Diamond': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    case 'Gold': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'Silver': return 'text-gray-300 bg-gray-400/10 border-gray-400/30';
    case 'Bronze': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'Common': return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    default: return 'text-muted-foreground bg-muted/10 border-border';
  }
}

/**
 * Get rarity icon/badge color
 */
export function getRarityBadgeColor(rarity: string): string {
  switch (rarity) {
    case 'Diamond': return 'bg-cyan-500';
    case 'Gold': return 'bg-yellow-500';
    case 'Silver': return 'bg-gray-400';
    case 'Bronze': return 'bg-orange-500';
    case 'Common': return 'bg-zinc-500';
    default: return 'bg-muted';
  }
}

/**
 * Format player height from API format (e.g., "6'4\"")
 */
export function formatHeight(height: string): string {
  return height.replace(/\\"/g, '"');
}

/**
 * Calculate "True Overall" similar to ShowZone
 * This weights attributes based on position for a more accurate rating
 */
export function calculateTrueOverall(player: MLBTheShowPlayer): number {
  if (player.is_hitter) {
    // Hitter formula - weight contact, power, and speed
    const contactAvg = (player.contact_left + player.contact_right) / 2;
    const powerAvg = (player.power_left + player.power_right) / 2;
    
    // Position-based weights
    let speedWeight = 0.15;
    let fieldingWeight = 0.10;
    let powerWeight = 0.35;
    let contactWeight = 0.40;
    
    // Adjust weights by position
    if (['LF', 'CF', 'RF'].includes(player.display_position)) {
      speedWeight = 0.20;
      fieldingWeight = 0.15;
      powerWeight = 0.30;
      contactWeight = 0.35;
    } else if (player.display_position === 'C') {
      speedWeight = 0.05;
      fieldingWeight = 0.20;
      powerWeight = 0.35;
      contactWeight = 0.40;
    } else if (['SS', '2B'].includes(player.display_position)) {
      speedWeight = 0.18;
      fieldingWeight = 0.17;
      powerWeight = 0.25;
      contactWeight = 0.40;
    }
    
    const trueOvr = 
      (contactAvg * contactWeight) +
      (powerAvg * powerWeight) +
      (player.speed * speedWeight) +
      (player.fielding_ability * fieldingWeight);
    
    return Math.round(trueOvr * 100) / 100;
  } else {
    // Pitcher formula - weight velocity, control, movement, and stamina
    const h9Weight = 0.20;
    const k9Weight = 0.20;
    const bb9Weight = 0.15;
    const hrWeight = 0.15;
    const velocityWeight = 0.15;
    const controlWeight = 0.10;
    const movementWeight = 0.05;
    
    const trueOvr = 
      (player.hits_per_bf * h9Weight) +
      (player.k_per_bf * k9Weight) +
      (player.bb_per_bf * bb9Weight) +
      (player.hr_per_bf * hrWeight) +
      (player.pitch_velocity * velocityWeight) +
      (player.pitch_control * controlWeight) +
      (player.pitch_movement * movementWeight);
    
    return Math.round(trueOvr * 100) / 100;
  }
}

/**
 * Get all unique positions from a player
 */
export function getAllPositions(player: MLBTheShowPlayer): string[] {
  const positions = [player.display_position];
  if (player.display_secondary_positions) {
    const secondary = player.display_secondary_positions.split(',').map(p => p.trim());
    positions.push(...secondary);
  }
  return positions.filter(Boolean);
}

/**
 * Compare two players side-by-side
 */
export function comparePlayersAttributes(
  player1: MLBTheShowPlayer,
  player2: MLBTheShowPlayer
): {
  attribute: string;
  player1Value: number;
  player2Value: number;
  difference: number;
  winner: 1 | 2 | 0;
}[] {
  const attributes = player1.is_hitter && player2.is_hitter
    ? [
        { key: 'contact_left', label: 'Contact L' },
        { key: 'contact_right', label: 'Contact R' },
        { key: 'power_left', label: 'Power L' },
        { key: 'power_right', label: 'Power R' },
        { key: 'plate_vision', label: 'Vision' },
        { key: 'plate_discipline', label: 'Discipline' },
        { key: 'batting_clutch', label: 'Clutch' },
        { key: 'speed', label: 'Speed' },
        { key: 'baserunning_ability', label: 'Baserunning' },
        { key: 'fielding_ability', label: 'Fielding' },
        { key: 'arm_strength', label: 'Arm Strength' },
        { key: 'arm_accuracy', label: 'Arm Accuracy' },
      ]
    : !player1.is_hitter && !player2.is_hitter
    ? [
        { key: 'stamina', label: 'Stamina' },
        { key: 'hits_per_bf', label: 'H/9' },
        { key: 'k_per_bf', label: 'K/9' },
        { key: 'bb_per_bf', label: 'BB/9' },
        { key: 'hr_per_bf', label: 'HR/9' },
        { key: 'pitch_velocity', label: 'Velocity' },
        { key: 'pitch_control', label: 'Control' },
        { key: 'pitch_movement', label: 'Movement' },
        { key: 'pitching_clutch', label: 'Clutch' },
      ]
    : []; // Mixed comparison not supported
  
  return attributes.map(attr => {
    const v1 = (player1 as Record<string, number>)[attr.key] || 0;
    const v2 = (player2 as Record<string, number>)[attr.key] || 0;
    const diff = v1 - v2;
    
    return {
      attribute: attr.label,
      player1Value: v1,
      player2Value: v2,
      difference: diff,
      winner: diff > 0 ? 1 : diff < 0 ? 2 : 0,
    };
  });
}

// =============================================================================
// SIMULATION ENGINE HELPERS
// =============================================================================

/**
 * Calculate hit probability for simulation engine
 * Based on batter attributes vs pitcher attributes
 */
export function calculateHitProbability(
  batter: MLBTheShowPlayer,
  pitcher: MLBTheShowPlayer,
  isLeftyPitcher: boolean
): {
  strikeout: number;
  walk: number;
  single: number;
  double: number;
  triple: number;
  homerun: number;
  out: number;
} {
  // Get appropriate contact/power based on pitcher handedness
  const contact = isLeftyPitcher ? batter.contact_left : batter.contact_right;
  const power = isLeftyPitcher ? batter.power_left : batter.power_right;
  
  // Base probabilities (empirical MLB averages)
  let strikeoutBase = 0.22;
  let walkBase = 0.08;
  let singleBase = 0.15;
  let doubleBase = 0.05;
  let tripleBase = 0.005;
  let homerunBase = 0.03;
  
  // Modify based on attributes
  // Contact reduces strikeouts, increases singles
  const contactFactor = contact / 100;
  strikeoutBase *= (2 - contactFactor);
  singleBase *= contactFactor;
  
  // Power increases extra-base hits
  const powerFactor = power / 100;
  doubleBase *= powerFactor;
  tripleBase *= powerFactor;
  homerunBase *= powerFactor;
  
  // Vision reduces strikeouts, increases walks
  const visionFactor = batter.plate_vision / 100;
  strikeoutBase *= (2 - visionFactor);
  walkBase *= visionFactor;
  
  // Discipline increases walks
  const disciplineFactor = batter.plate_discipline / 100;
  walkBase *= disciplineFactor;
  
  // Pitcher K/9 increases strikeouts
  const k9Factor = pitcher.k_per_bf / 100;
  strikeoutBase *= k9Factor;
  
  // Pitcher BB/9 increases walks (lower is better for pitcher)
  const bb9Factor = (125 - pitcher.bb_per_bf) / 125;
  walkBase *= (2 - bb9Factor);
  
  // Pitcher H/9 affects hits (lower is better for pitcher)
  const h9Factor = (125 - pitcher.hits_per_bf) / 125;
  singleBase *= (2 - h9Factor);
  doubleBase *= (2 - h9Factor);
  
  // Pitcher HR/9 affects home runs (lower is better for pitcher)
  const hr9Factor = (125 - pitcher.hr_per_bf) / 125;
  homerunBase *= (2 - hr9Factor);
  
  // Speed affects triples
  const speedFactor = batter.speed / 100;
  tripleBase *= speedFactor;
  
  // Normalize to ensure they sum to ~1
  const total = strikeoutBase + walkBase + singleBase + doubleBase + tripleBase + homerunBase;
  const outBase = Math.max(0.4, 1 - total); // At least 40% outs
  
  const grandTotal = total + outBase;
  
  return {
    strikeout: strikeoutBase / grandTotal,
    walk: walkBase / grandTotal,
    single: singleBase / grandTotal,
    double: doubleBase / grandTotal,
    triple: tripleBase / grandTotal,
    homerun: homerunBase / grandTotal,
    out: outBase / grandTotal,
  };
}

/**
 * Simulate a single at-bat outcome
 */
export function simulateAtBat(
  batter: MLBTheShowPlayer,
  pitcher: MLBTheShowPlayer
): 'strikeout' | 'walk' | 'single' | 'double' | 'triple' | 'homerun' | 'groundout' | 'flyout' | 'lineout' {
  const isLeftyPitcher = pitcher.throw_hand === 'L';
  const probs = calculateHitProbability(batter, pitcher, isLeftyPitcher);
  
  const roll = Math.random();
  let cumulative = 0;
  
  cumulative += probs.strikeout;
  if (roll < cumulative) return 'strikeout';
  
  cumulative += probs.walk;
  if (roll < cumulative) return 'walk';
  
  cumulative += probs.single;
  if (roll < cumulative) return 'single';
  
  cumulative += probs.double;
  if (roll < cumulative) return 'double';
  
  cumulative += probs.triple;
  if (roll < cumulative) return 'triple';
  
  cumulative += probs.homerun;
  if (roll < cumulative) return 'homerun';
  
  // Random out type
  const outTypes = ['groundout', 'flyout', 'lineout'] as const;
  return outTypes[Math.floor(Math.random() * outTypes.length)];
}

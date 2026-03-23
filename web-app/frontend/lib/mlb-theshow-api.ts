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

// Use our Next.js API route to proxy requests (avoids CORS issues)
const API_PROXY_BASE = '/api/mlb-theshow';

// Cache configuration
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour for player data
const ROSTER_UPDATE_CACHE_MS = 1000 * 60 * 15; // 15 minutes for roster updates

// In-memory cache (will be replaced with Supabase caching later)
const playerCache = new Map<string, { data: MLBTheShowPlayer; timestamp: number }>();
const searchCache = new Map<string, { data: PlayerSearchResult[]; timestamp: number }>();

// Cache for all Live Series players - loaded once, used for all searches
let allLiveSeriesPlayersCache: {
  players: PlayerSearchResult[];
  timestamp: number;
  loading: boolean;
  promise: Promise<PlayerSearchResult[]> | null;
} = {
  players: [],
  timestamp: 0,
  loading: false,
  promise: null,
};

// Helper to build proxy URL
function buildProxyUrl(endpoint: string, params: Record<string, string | number> = {}): string {
  const searchParams = new URLSearchParams({ endpoint });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return `${API_PROXY_BASE}?${searchParams.toString()}`;
}

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
    const url = buildProxyUrl('items', { type: 'mlb_card', page });
    const response = await fetch(url);
    
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
    const url = buildProxyUrl('item', { uuid });
    const response = await fetch(url);
    
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
 * Load ALL Live Series players and cache them
 * This is called once and the data is reused for all searches
 */
async function loadAllLiveSeriesPlayers(): Promise<PlayerSearchResult[]> {
  // Return cached data if still valid (cache for 30 min)
  const FULL_CACHE_DURATION = 1000 * 60 * 30;
  if (allLiveSeriesPlayersCache.players.length > 0 && 
      Date.now() - allLiveSeriesPlayersCache.timestamp < FULL_CACHE_DURATION) {
    return allLiveSeriesPlayersCache.players;
  }
  
  // If already loading, wait for that promise
  if (allLiveSeriesPlayersCache.loading && allLiveSeriesPlayersCache.promise) {
    return allLiveSeriesPlayersCache.promise;
  }
  
  allLiveSeriesPlayersCache.loading = true;
  
  const loadPromise = (async () => {
    console.log('[MLB API] Loading all Live Series players...');
    const allPlayers: PlayerSearchResult[] = [];
    
    // First, get total pages
    const firstUrl = buildProxyUrl('items', { type: 'mlb_card', page: 1 });
    const firstResponse = await fetch(firstUrl);
    if (!firstResponse.ok) throw new Error('Failed to fetch first page');
    
    const firstData: MLBTheShowAPIResponse<MLBTheShowPlayer> = await firstResponse.json();
    const totalPages = firstData.total_pages;
    console.log(`[MLB API] Total pages to fetch: ${totalPages}`);
    
    // Process first page
    const firstFiltered = (firstData.items || [])
      .filter(p => p.series === 'Live' && p.is_live_set)
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
    allPlayers.push(...firstFiltered);
    
    // Fetch remaining pages in batches of 10 (to avoid overwhelming the API)
    const BATCH_SIZE = 10;
    for (let batchStart = 2; batchStart <= totalPages; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPages);
      const pagePromises = [];
      
      for (let page = batchStart; page <= batchEnd; page++) {
        const url = buildProxyUrl('items', { type: 'mlb_card', page });
        pagePromises.push(
          fetch(url)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
      }
      
      const results = await Promise.all(pagePromises);
      
      for (const data of results) {
        if (!data || !data.items) continue;
        
        const filtered = data.items
          .filter((p: MLBTheShowPlayer) => p.series === 'Live' && p.is_live_set)
          .map((p: MLBTheShowPlayer) => ({
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
      }
    }
    
    console.log(`[MLB API] Loaded ${allPlayers.length} Live Series players`);
    
    // Sort by OVR descending
    allPlayers.sort((a, b) => b.ovr - a.ovr);
    
    // Update cache
    allLiveSeriesPlayersCache.players = allPlayers;
    allLiveSeriesPlayersCache.timestamp = Date.now();
    allLiveSeriesPlayersCache.loading = false;
    allLiveSeriesPlayersCache.promise = null;
    
    return allPlayers;
  })();
  
  allLiveSeriesPlayersCache.promise = loadPromise;
  
  try {
    return await loadPromise;
  } catch (error) {
    allLiveSeriesPlayersCache.loading = false;
    allLiveSeriesPlayersCache.promise = null;
    throw error;
  }
}

/**
 * Normalize a player name for better matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.''-]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')   // Normalize spaces
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, '') // Remove suffixes
    .trim();
}

/**
 * Calculate similarity score between two names (0-1)
 */
function nameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) return 1;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  // Split into parts and check matches
  const parts1 = n1.split(' ').filter(p => p.length > 1);
  const parts2 = n2.split(' ').filter(p => p.length > 1);
  
  // Count matching parts
  let matchScore = 0;
  for (const p1 of parts1) {
    for (const p2 of parts2) {
      if (p1 === p2) {
        matchScore += 1;
      } else if (p1.startsWith(p2) || p2.startsWith(p1)) {
        matchScore += 0.7;
      }
    }
  }
  
  const maxParts = Math.max(parts1.length, parts2.length);
  if (maxParts === 0) return 0;
  
  return Math.min(1, matchScore / maxParts);
}

/**
 * Search players by name (Live Series only)
 * Uses cached data for instant search results
 * Now with improved fuzzy matching!
 */
export async function searchPlayers(
  query: string,
  options: {
    team?: string;
    position?: string;
    minOvr?: number;
    maxOvr?: number;
    rarity?: string;
    fuzzy?: boolean; // Enable fuzzy matching for better results
  } = {}
): Promise<PlayerSearchResult[]> {
  // Load all players first (uses cache if available)
  const allPlayers = await loadAllLiveSeriesPlayers();
  
  const queryLower = query?.toLowerCase() || '';
  const queryNorm = normalizeName(query || '');
  
  // Filter based on criteria
  let filtered = allPlayers.filter(p => {
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
    
    // Name search - basic contains check
    if (query) {
      const pNameLower = p.name.toLowerCase();
      if (!pNameLower.includes(queryLower) && !queryLower.includes(pNameLower)) {
        // Try normalized match
        const pNameNorm = normalizeName(p.name);
        if (!pNameNorm.includes(queryNorm) && !queryNorm.includes(pNameNorm)) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  // If no results and we have a query, try fuzzy search
  if (filtered.length === 0 && query && query.length >= 3) {
    const fuzzyResults = allPlayers
      .filter(p => {
        // Apply non-name filters first
        if (options.team && p.team_short_name !== options.team && p.team !== options.team) return false;
        if (options.position && p.display_position !== options.position) return false;
        if (options.minOvr && p.ovr < options.minOvr) return false;
        if (options.maxOvr && p.ovr > options.maxOvr) return false;
        if (options.rarity && p.rarity !== options.rarity) return false;
        return true;
      })
      .map(p => ({
        player: p,
        score: nameSimilarity(query, p.name),
      }))
      .filter(r => r.score >= 0.5) // At least 50% match
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.player);
    
    filtered = fuzzyResults;
  }
  
  return filtered;
}

/**
 * Quick search for a player by name without loading entire database
 * Uses alphabetical page estimation to find player faster
 */
async function quickSearchByName(name: string): Promise<PlayerSearchResult | null> {
  const normalizedQuery = name.toLowerCase().trim();
  const firstLetter = normalizedQuery.charAt(0);
  
  // Estimate page range based on first letter (API sorts alphabetically)
  // Total ~146 pages, roughly 5-6 pages per letter
  const letterToPage: Record<string, number> = {
    'a': 1, 'b': 12, 'c': 24, 'd': 36, 'e': 45, 'f': 50,
    'g': 56, 'h': 62, 'i': 68, 'j': 72, 'k': 82, 'l': 88,
    'm': 94, 'n': 104, 'o': 108, 'p': 112, 'q': 116, 'r': 118,
    's': 124, 't': 130, 'u': 134, 'v': 136, 'w': 140, 'x': 144,
    'y': 145, 'z': 146
  };
  
  const startPage = letterToPage[firstLetter] || 1;
  const endPage = Math.min(startPage + 8, 146); // Check ~8 pages
  
  console.log(`[MLB API] Quick search for "${name}" starting at page ${startPage}`);
  
  // Fetch pages in parallel
  const pagePromises = [];
  for (let page = startPage; page <= endPage; page++) {
    const url = buildProxyUrl('items', { type: 'mlb_card', page });
    pagePromises.push(
      fetch(url)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );
  }
  
  const results = await Promise.all(pagePromises);
  
  let bestMatch: PlayerSearchResult | null = null;
  let bestScore = 0;
  
  for (const data of results) {
    if (!data || !data.items) continue;
    
    for (const p of data.items) {
      if (p.series !== 'Live' || !p.is_live_set) continue;
      
      const score = nameSimilarity(name, p.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
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
        };
      }
      
      // If exact match, return immediately
      if (score === 1) {
        console.log(`[MLB API] Found exact match: ${p.name}`);
        return bestMatch;
      }
    }
  }
  
  if (bestMatch && bestScore >= 0.7) {
    console.log(`[MLB API] Found match: ${bestMatch.name} (score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }
  
  console.log(`[MLB API] No match found for "${name}" (best score: ${bestScore.toFixed(2)})`);
  return null;
}

/**
 * Find a player by name with fuzzy matching
 * Returns the best match or null
 * Uses quick search first, then falls back to full database if needed
 */
export async function findPlayerByName(
  name: string,
  options: { position?: string; team?: string } = {}
): Promise<PlayerSearchResult | null> {
  console.log(`[MLB API] findPlayerByName called for: "${name}"`);
  
  // Try quick search first (much faster)
  const quickResult = await quickSearchByName(name);
  if (quickResult) {
    // Verify position if specified
    if (options.position && quickResult.display_position !== options.position) {
      console.log(`[MLB API] Position mismatch: wanted ${options.position}, got ${quickResult.display_position}`);
      // Still return if close match, position might be secondary
    }
    return quickResult;
  }
  
  // Fall back to full database search if quick search fails
  console.log(`[MLB API] Quick search failed, trying full database...`);
  const allPlayers = await loadAllLiveSeriesPlayers();
  
  // Filter by position/team first if provided
  let candidates = allPlayers;
  if (options.position) {
    candidates = candidates.filter(p => p.display_position === options.position);
  }
  if (options.team) {
    candidates = candidates.filter(p => 
      p.team_short_name === options.team || p.team === options.team
    );
  }
  
  // Score all candidates
  const scored = candidates.map(p => ({
    player: p,
    score: nameSimilarity(name, p.name),
  }));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return best match if score is good enough
  if (scored.length > 0 && scored[0].score >= 0.6) {
    console.log(`[MLB API] Found in full DB: ${scored[0].player.name}`);
    return scored[0].player;
  }
  
  // If we filtered by position/team and got no good match, try without filters
  if ((options.position || options.team) && scored[0]?.score < 0.6) {
    const allScored = allPlayers.map(p => ({
      player: p,
      score: nameSimilarity(name, p.name),
    }));
    allScored.sort((a, b) => b.score - a.score);
    
    if (allScored.length > 0 && allScored[0].score >= 0.6) {
      console.log(`[MLB API] Found without filters: ${allScored[0].player.name}`);
      return allScored[0].player;
    }
  }
  
  console.log(`[MLB API] Player not found: "${name}"`);
  return null;
}

/**
 * Fetch roster updates (for buff/nerf tracking)
 */
export async function fetchRosterUpdates(page: number = 1): Promise<{
  updates: MLBTheShowRosterUpdate[];
  totalPages: number;
}> {
  try {
    const url = buildProxyUrl('roster_updates', { page });
    const response = await fetch(url);
    
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
    const url = buildProxyUrl('roster_update', { id });
    const response = await fetch(url);
    
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
    const v1 = (player1 as unknown as Record<string, number>)[attr.key] || 0;
    const v2 = (player2 as unknown as Record<string, number>)[attr.key] || 0;
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

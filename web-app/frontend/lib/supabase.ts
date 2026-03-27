import { createClient } from '@supabase/supabase-js';
import { CURRENT_SEASON_GAME_MIN_DATE } from '@/config/season-games';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zroiqbyswhawjbblpmwm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyb2lxYnlzd2hhd2piYmxwbXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Nzc2MTAsImV4cCI6MjA4MzM1MzYxMH0.Cxx2Q3_TKs1g3onePunW1NK1ys7Ai_qMN4MPCcEyYIA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================================================
// RECAP CREDITS SYSTEM
// Users earn recap credits by logging games, and spend them to generate recaps
// =============================================================================

const RECAP_CREDITS_KEY = 'jkap_recap_credits';
const STARTING_RECAP_CREDITS = 0; // Users start with 0 credits, must log games to earn them

export interface RecapCredits {
  credits: number;
  totalEarned: number;
  totalUsed: number;
  lastUpdated: string;
}

// Get user's recap credits from localStorage
export function getRecapCredits(userId: string): RecapCredits {
  if (typeof window === 'undefined') {
    return { credits: STARTING_RECAP_CREDITS, totalEarned: 0, totalUsed: 0, lastUpdated: new Date().toISOString() };
  }
  
  try {
    const stored = localStorage.getItem(RECAP_CREDITS_KEY);
    if (stored) {
      const allCredits = JSON.parse(stored);
      if (allCredits[userId]) {
        return allCredits[userId];
      }
    }
  } catch (e) {
    console.error('Error reading recap credits:', e);
  }
  
  return { credits: STARTING_RECAP_CREDITS, totalEarned: 0, totalUsed: 0, lastUpdated: new Date().toISOString() };
}

// Award recap credit (called when user logs a game)
export function awardRecapCredit(userId: string, amount: number = 1): RecapCredits {
  if (typeof window === 'undefined') {
    return { credits: amount, totalEarned: amount, totalUsed: 0, lastUpdated: new Date().toISOString() };
  }
  
  try {
    const stored = localStorage.getItem(RECAP_CREDITS_KEY);
    const allCredits = stored ? JSON.parse(stored) : {};
    
    const current = allCredits[userId] || { credits: STARTING_RECAP_CREDITS, totalEarned: 0, totalUsed: 0 };
    const updated: RecapCredits = {
      credits: current.credits + amount,
      totalEarned: current.totalEarned + amount,
      totalUsed: current.totalUsed,
      lastUpdated: new Date().toISOString(),
    };
    
    allCredits[userId] = updated;
    localStorage.setItem(RECAP_CREDITS_KEY, JSON.stringify(allCredits));
    
    console.log(`Awarded ${amount} recap credit(s) to user ${userId}. Total: ${updated.credits}`);
    return updated;
  } catch (e) {
    console.error('Error awarding recap credit:', e);
    return { credits: amount, totalEarned: amount, totalUsed: 0, lastUpdated: new Date().toISOString() };
  }
}

// Use a recap credit (called when user generates a recap)
export function useRecapCredit(userId: string): { success: boolean; remaining: number; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, remaining: 0, error: 'Not available' };
  }
  
  try {
    const current = getRecapCredits(userId);
    
    if (current.credits <= 0) {
      return { success: false, remaining: 0, error: 'No recap credits available. Log a game to earn credits!' };
    }
    
    const stored = localStorage.getItem(RECAP_CREDITS_KEY);
    const allCredits = stored ? JSON.parse(stored) : {};
    
    const updated: RecapCredits = {
      credits: current.credits - 1,
      totalEarned: current.totalEarned,
      totalUsed: current.totalUsed + 1,
      lastUpdated: new Date().toISOString(),
    };
    
    allCredits[userId] = updated;
    localStorage.setItem(RECAP_CREDITS_KEY, JSON.stringify(allCredits));
    
    console.log(`Used 1 recap credit for user ${userId}. Remaining: ${updated.credits}`);
    return { success: true, remaining: updated.credits };
  } catch (e) {
    console.error('Error using recap credit:', e);
    return { success: false, remaining: 0, error: 'Failed to use credit' };
  }
}

// Check if user has recap credits available
export function hasRecapCredits(userId: string): boolean {
  const credits = getRecapCredits(userId);
  return credits.credits > 0;
}

// =============================================================================
// RECENT GAMES STORAGE
// Save logged games so Game Recap can auto-fill from them
// =============================================================================

const RECENT_GAMES_KEY = 'jkap_recent_games';
const MAX_RECENT_GAMES = 20;

export interface RecentGame {
  id: string;
  userTeamId: string;
  opponentTeamId: string;
  userScore: number;
  opponentScore: number;
  isWin: boolean;
  gameNumber?: number;
  gameDate: string;
  winningPitcher?: string;
  losingPitcher?: string;
  savePitcher?: string;
  homeRuns?: { player: string; count: number }[];
  strikeouts?: number;
  notes?: string;
  loggedAt: string;
}

// Get recent games for a user
export function getRecentGames(userId: string): RecentGame[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_GAMES_KEY);
    if (stored) {
      const allGames = JSON.parse(stored);
      return allGames[userId] || [];
    }
  } catch (e) {
    console.error('Error getting recent games:', e);
  }
  return [];
}

// Save a game to recent games
export function saveRecentGame(userId: string, game: Omit<RecentGame, 'id' | 'loggedAt'>): RecentGame {
  const newGame: RecentGame = {
    ...game,
    id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    loggedAt: new Date().toISOString(),
  };
  
  if (typeof window === 'undefined') return newGame;
  
  try {
    const stored = localStorage.getItem(RECENT_GAMES_KEY);
    const allGames = stored ? JSON.parse(stored) : {};
    
    const userGames = allGames[userId] || [];
    userGames.unshift(newGame); // Add to front
    
    // Keep only the most recent games
    allGames[userId] = userGames.slice(0, MAX_RECENT_GAMES);
    localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify(allGames));
    
    console.log('Saved recent game for user:', userId, newGame.id);
    return newGame;
  } catch (e) {
    console.error('Error saving recent game:', e);
    return newGame;
  }
}

// =============================================================================
// PLAYER NAMES STORAGE
// Save player names for autocomplete/dropdown suggestions
// =============================================================================

const PLAYER_NAMES_KEY = 'jkap_player_names';
const MAX_PLAYER_NAMES = 50;

export interface SavedPlayers {
  pitchers: string[];
  hitters: string[];
  lastUpdated: string;
}

// Get saved player names for a user
export function getSavedPlayers(userId: string): SavedPlayers {
  if (typeof window === 'undefined') {
    return { pitchers: [], hitters: [], lastUpdated: new Date().toISOString() };
  }
  
  try {
    const stored = localStorage.getItem(PLAYER_NAMES_KEY);
    if (stored) {
      const allPlayers = JSON.parse(stored);
      if (allPlayers[userId]) {
        return allPlayers[userId];
      }
    }
  } catch (e) {
    console.error('Error getting saved players:', e);
  }
  return { pitchers: [], hitters: [], lastUpdated: new Date().toISOString() };
}

// Add a pitcher name to saved players (if not already present)
export function savePitcherName(userId: string, name: string): void {
  if (!name || typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(PLAYER_NAMES_KEY);
    const allPlayers = stored ? JSON.parse(stored) : {};
    const userPlayers = allPlayers[userId] || { pitchers: [], hitters: [], lastUpdated: new Date().toISOString() };
    
    // Add if not already in list (case-insensitive check)
    const normalizedName = name.trim();
    if (!userPlayers.pitchers.some((p: string) => p.toLowerCase() === normalizedName.toLowerCase())) {
      userPlayers.pitchers.unshift(normalizedName);
      userPlayers.pitchers = userPlayers.pitchers.slice(0, MAX_PLAYER_NAMES);
      userPlayers.lastUpdated = new Date().toISOString();
      allPlayers[userId] = userPlayers;
      localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(allPlayers));
    }
  } catch (e) {
    console.error('Error saving pitcher name:', e);
  }
}

// Add a hitter name to saved players (if not already present)
export function saveHitterName(userId: string, name: string): void {
  if (!name || typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(PLAYER_NAMES_KEY);
    const allPlayers = stored ? JSON.parse(stored) : {};
    const userPlayers = allPlayers[userId] || { pitchers: [], hitters: [], lastUpdated: new Date().toISOString() };
    
    // Add if not already in list (case-insensitive check)
    const normalizedName = name.trim();
    if (!userPlayers.hitters.some((p: string) => p.toLowerCase() === normalizedName.toLowerCase())) {
      userPlayers.hitters.unshift(normalizedName);
      userPlayers.hitters = userPlayers.hitters.slice(0, MAX_PLAYER_NAMES);
      userPlayers.lastUpdated = new Date().toISOString();
      allPlayers[userId] = userPlayers;
      localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(allPlayers));
    }
  } catch (e) {
    console.error('Error saving hitter name:', e);
  }
}

// Save multiple player names at once (from a game log)
export function savePlayersFromGame(userId: string, game: {
  winningPitcher?: string;
  losingPitcher?: string;
  savePitcher?: string;
  homeRuns?: { player: string; count: number }[];
}): void {
  if (game.winningPitcher) savePitcherName(userId, game.winningPitcher);
  if (game.losingPitcher) savePitcherName(userId, game.losingPitcher);
  if (game.savePitcher) savePitcherName(userId, game.savePitcher);
  
  if (game.homeRuns) {
    game.homeRuns.forEach(hr => saveHitterName(userId, hr.player));
  }
}

// =============================================================================

// Types for our database
export interface DBUser {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  team_id: string | null;
  is_admin: boolean;
  created_at: string;
  // Commissioner/contact fields
  email?: string | null;
  phone?: string | null;
  league_name?: string | null;
  user_type?: 'jkap_member' | 'external_commissioner' | null;
  // Gaming profile
  gamertag?: string | null;
}

export interface DBTeam {
  id: string;
  name: string;
  abbreviation: string;
  claimed_by: string | null;
}

// Extended user creation options
export interface CreateUserOptions {
  username: string;
  password: string;
  displayName: string;
  teamId?: string | null;
  isAdmin?: boolean;
  email?: string | null;
  phone?: string | null;
  leagueName?: string | null;
  userType?: 'jkap_member' | 'external_commissioner' | null;
}

// Helper functions for user management
export async function createUser(
  options: CreateUserOptions
): Promise<{ success: boolean; user?: DBUser; error?: string }> {
  const {
    username,
    password,
    displayName,
    teamId = null,
    isAdmin = false,
    email = null,
    phone = null,
    leagueName = null,
    userType = null,
  } = options;

  try {
    // Check if username already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existing) {
      return { success: false, error: 'Username already taken' };
    }

    // Check if team is already claimed (if teamId provided)
    if (teamId) {
      const { data: teamCheck } = await supabase
        .from('users')
        .select('id')
        .eq('team_id', teamId)
        .single();

      if (teamCheck) {
        return { success: false, error: 'Team is already claimed' };
      }
    }

    // Create the user (storing password as plain text for now - in production use proper hashing)
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase(),
        password_hash: password, // Note: In production, hash this!
        display_name: displayName,
        team_id: teamId,
        is_admin: isAdmin,
        email: email,
        phone: phone,
        league_name: leagueName,
        user_type: userType,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (err: any) {
    console.error('Create user error:', err);
    return { success: false, error: err.message || 'Failed to create user' };
  }
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: DBUser; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('password_hash', password)
      .single();

    if (error || !data) {
      return { success: false, error: 'Invalid username or password' };
    }

    return { success: true, user: data };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err.message || 'Login failed' };
  }
}

export async function getAllUsers(): Promise<DBUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

export async function getClaimedTeams(): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .select('team_id')
    .not('team_id', 'is', null);

  if (error) {
    console.error('Error fetching claimed teams:', error);
    return [];
  }

  return data?.map(u => u.team_id).filter(Boolean) || [];
}

// Get user by team ID (for forgot username)
export async function getUserByTeam(teamId: string): Promise<{ success: boolean; user?: DBUser; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error || !data) {
      return { success: false, error: 'No user found for this team' };
    }

    return { success: true, user: data };
  } catch (err: any) {
    console.error('Error looking up user by team:', err);
    return { success: false, error: err.message || 'Failed to look up user' };
  }
}

// Verify user for password reset (check username and team match)
export async function verifyUserForReset(username: string, teamId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, team_id')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !data) {
      return { success: false, error: 'Username not found' };
    }

    if (data.team_id !== teamId) {
      return { success: false, error: 'Team does not match this account' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error verifying user for reset:', err);
    return { success: false, error: err.message || 'Verification failed' };
  }
}

// Reset user password
export async function resetUserPassword(username: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newPassword })
      .eq('username', username.toLowerCase());

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return { success: false, error: err.message || 'Password reset failed' };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: newPassword })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<DBUser, 'display_name' | 'team_id' | 'username' | 'email' | 'phone'>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update member email by team abbreviation
 * Used by commissioner to match Typeform emails to members
 */
export async function updateMemberEmailByTeam(
  teamAbbr: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update({ email: email.toLowerCase() })
    .eq('team_id', teamAbbr)
    .eq('user_type', 'jkap_member');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Bulk update member emails from a mapping of team -> email
 */
export async function bulkUpdateMemberEmails(
  emailMapping: Record<string, string>
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  for (const [teamAbbr, email] of Object.entries(emailMapping)) {
    const result = await updateMemberEmailByTeam(teamAbbr, email);
    if (result.success) {
      updated++;
    } else {
      errors.push(`${teamAbbr}: ${result.error}`);
    }
  }

  return { success: errors.length === 0, updated, errors };
}

/**
 * Update a member's gamertag by their email
 */
export async function updateMemberGamertagByEmail(
  email: string,
  gamertag: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('users')
    .update({ gamertag })
    .eq('email', email.toLowerCase());

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Bulk update gamertags from questionnaire data
 */
export async function bulkUpdateGamertagsFromQuestionnaire(
  data: { email: string; gamertag: string }[]
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  for (const { email, gamertag } of data) {
    if (!gamertag) continue;
    
    const result = await updateMemberGamertagByEmail(email, gamertag);
    if (result.success) {
      updated++;
    } else {
      errors.push(`${email}: ${result.error}`);
    }
  }

  return { success: errors.length === 0, updated, errors };
}

// =============================================================================
// LEAGUE SETTINGS (Central configuration for all users)
// =============================================================================

// Offseason phases in order
export type OffseasonPhase = 
  | 'pre_offseason'    // Season is still active
  | 'declarations'     // Declarations period open
  | 'claiming'         // Claiming period open
  | 'processing'       // Claims being processed
  | 'signings'         // Signings being finalized
  | 'complete';        // Offseason complete

export const OFFSEASON_PHASES: { id: OffseasonPhase; label: string; description: string }[] = [
  { id: 'pre_offseason', label: 'Pre-Offseason', description: 'Season is still active' },
  { id: 'declarations', label: 'Declarations', description: 'Teams are declaring free agents' },
  { id: 'claiming', label: 'Claiming', description: 'Teams are submitting claims' },
  { id: 'processing', label: 'Processing', description: 'Claims are being resolved' },
  { id: 'signings', label: 'Signings', description: 'Finalizing player signings' },
  { id: 'complete', label: 'Complete', description: 'Offseason is finished' },
];

export interface LeagueSettings {
  id?: string;
  discord_webhook_url: string | null;  // For IL Manager transactions
  discord_webhook_url_announcements: string | null;  // For Commissioner announcements (main chat)
  auto_post_discord: boolean;
  announcement_style: 'espn' | 'simple';
  openai_api_key: string | null;  // Centralized API key for whole league
  claiming_open: boolean;  // Whether claiming period is open
  claiming_opened_at: string | null;  // When claiming was opened
  claiming_closes_at: string | null;  // When claiming will close
  offseason_phase: OffseasonPhase;  // Current offseason phase
  offseason_phase_updated_at: string | null;  // When phase was last changed
  updated_at?: string;
}

const DEFAULT_SETTINGS: LeagueSettings = {
  discord_webhook_url: null,
  discord_webhook_url_announcements: null,
  auto_post_discord: false,
  announcement_style: 'espn',
  openai_api_key: null,
  claiming_open: false,
  claiming_opened_at: null,
  claiming_closes_at: null,
  offseason_phase: 'declarations',
  offseason_phase_updated_at: null,
};

export async function getLeagueSettings(): Promise<LeagueSettings> {
  try {
    const { data, error } = await supabase
      .from('league_settings')
      .select('*')
      .single();

    if (error || !data) {
      // Return defaults if no settings exist
      return DEFAULT_SETTINGS;
    }

    return {
      id: data.id,
      discord_webhook_url: data.discord_webhook_url,
      discord_webhook_url_announcements: data.discord_webhook_url_announcements ?? null,
      auto_post_discord: data.auto_post_discord ?? false,
      announcement_style: data.announcement_style ?? 'espn',
      openai_api_key: data.openai_api_key ?? null,
      claiming_open: data.claiming_open ?? false,
      claiming_opened_at: data.claiming_opened_at ?? null,
      claiming_closes_at: data.claiming_closes_at ?? null,
      offseason_phase: data.offseason_phase ?? 'declarations',
      offseason_phase_updated_at: data.offseason_phase_updated_at ?? null,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Error fetching league settings:', err);
    return DEFAULT_SETTINGS;
  }
}

// Get just the OpenAI API key (for use by all users)
export async function getOpenAIApiKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('league_settings')
      .select('openai_api_key')
      .single();

    if (error || !data) {
      return null;
    }

    return data.openai_api_key;
  } catch (err) {
    console.error('Error fetching OpenAI API key:', err);
    return null;
  }
}

// Save just the OpenAI API key (admin only)
export async function saveOpenAIApiKey(apiKey: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to get existing settings
    const { data: existing } = await supabase
      .from('league_settings')
      .select('id')
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('league_settings')
        .update({
          openai_api_key: apiKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Insert new with defaults
      const { error } = await supabase
        .from('league_settings')
        .insert({
          openai_api_key: apiKey,
          discord_webhook_url: null,
          auto_post_discord: false,
          announcement_style: 'espn',
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving OpenAI API key:', err);
    return { success: false, error: err.message || 'Failed to save API key' };
  }
}

export async function saveLeagueSettings(
  settings: Partial<LeagueSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to get existing settings
    const { data: existing } = await supabase
      .from('league_settings')
      .select('id')
      .single();

    if (existing) {
      // Update existing - only update fields that are provided
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (settings.discord_webhook_url !== undefined) updateData.discord_webhook_url = settings.discord_webhook_url;
      if (settings.discord_webhook_url_announcements !== undefined) updateData.discord_webhook_url_announcements = settings.discord_webhook_url_announcements;
      if (settings.auto_post_discord !== undefined) updateData.auto_post_discord = settings.auto_post_discord;
      if (settings.announcement_style !== undefined) updateData.announcement_style = settings.announcement_style;
      if (settings.openai_api_key !== undefined) updateData.openai_api_key = settings.openai_api_key;
      // Claiming period fields
      if (settings.claiming_open !== undefined) updateData.claiming_open = settings.claiming_open;
      if (settings.claiming_opened_at !== undefined) updateData.claiming_opened_at = settings.claiming_opened_at;
      if (settings.claiming_closes_at !== undefined) updateData.claiming_closes_at = settings.claiming_closes_at;
      // Offseason phase fields
      if (settings.offseason_phase !== undefined) updateData.offseason_phase = settings.offseason_phase;
      if (settings.offseason_phase_updated_at !== undefined) updateData.offseason_phase_updated_at = settings.offseason_phase_updated_at;

      const { error } = await supabase
        .from('league_settings')
        .update(updateData)
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('league_settings')
        .insert({
          discord_webhook_url: settings.discord_webhook_url ?? null,
          discord_webhook_url_announcements: settings.discord_webhook_url_announcements ?? null,
          auto_post_discord: settings.auto_post_discord ?? false,
          announcement_style: settings.announcement_style ?? 'espn',
          openai_api_key: settings.openai_api_key ?? null,
          claiming_open: settings.claiming_open ?? false,
          claiming_opened_at: settings.claiming_opened_at ?? null,
          claiming_closes_at: settings.claiming_closes_at ?? null,
          offseason_phase: settings.offseason_phase ?? 'declarations',
          offseason_phase_updated_at: settings.offseason_phase_updated_at ?? null,
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving league settings:', err);
    return { success: false, error: err.message || 'Failed to save settings' };
  }
}

// =============================================================================
// IL PLACEMENTS (Central storage for all teams)
// =============================================================================

export interface DBILPlacement {
  id: string;
  team_id: string;
  player_id: string;
  player_name: string;
  player_position: string;
  player_type: 'pitcher' | 'position';
  injury_type: string;
  start_game: number;
  start_date: string;
  end_game: number | null;
  end_date: string | null;
  games_on_il: number;
  status: 'active' | 'completed';
  created_at: string;
  created_by: string | null;
}

export async function getILPlacements(): Promise<DBILPlacement[]> {
  try {
    const { data, error } = await supabase
      .from('il_placements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching IL placements:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching IL placements:', err);
    return [];
  }
}

export async function addILPlacement(
  placement: Omit<DBILPlacement, 'created_at'>
): Promise<{ success: boolean; placement?: DBILPlacement; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('il_placements')
      .insert({
        id: placement.id,
        team_id: placement.team_id,
        player_id: placement.player_id,
        player_name: placement.player_name,
        player_position: placement.player_position,
        player_type: placement.player_type,
        injury_type: placement.injury_type,
        start_game: placement.start_game,
        start_date: placement.start_date,
        end_game: placement.end_game,
        end_date: placement.end_date,
        games_on_il: placement.games_on_il,
        status: placement.status,
        created_by: placement.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding IL placement:', error);
      return { success: false, error: error.message };
    }

    return { success: true, placement: data };
  } catch (err: any) {
    console.error('Error adding IL placement:', err);
    return { success: false, error: err.message || 'Failed to add placement' };
  }
}

export async function updateILPlacement(
  id: string,
  updates: Partial<DBILPlacement>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('il_placements')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating IL placement:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error updating IL placement:', err);
    return { success: false, error: err.message || 'Failed to update placement' };
  }
}

export async function deleteILPlacement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('il_placements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting IL placement:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting IL placement:', err);
    return { success: false, error: err.message || 'Failed to delete placement' };
  }
}

// =============================================================================
// RETROACTIVE IL REQUESTS (Requires Commissioner Approval)
// =============================================================================

const RETROACTIVE_IL_KEY = 'jkap_retroactive_il_requests';

export interface RetroactiveILRequest {
  id: string;
  team_id: string;
  team_name: string;
  player_id: string;
  player_name: string;
  player_position: string;
  player_type: 'pitcher' | 'position';
  injury_type: string;
  requested_start_date: string;
  requested_start_game: number;
  reason: string; // Why it needs to be retroactive
  status: 'pending' | 'approved' | 'denied';
  requested_by: string;
  requested_by_name: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

// Get all retroactive IL requests
export function getRetroactiveILRequests(): RetroactiveILRequest[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RETROACTIVE_IL_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error getting retroactive IL requests:', e);
    return [];
  }
}

// Get pending retroactive IL requests (for commissioner review)
export function getPendingRetroactiveILRequests(): RetroactiveILRequest[] {
  return getRetroactiveILRequests().filter(r => r.status === 'pending');
}

// Get retroactive IL requests for a specific team
export function getTeamRetroactiveILRequests(teamId: string): RetroactiveILRequest[] {
  return getRetroactiveILRequests().filter(r => r.team_id === teamId);
}

// Submit a retroactive IL request
export function submitRetroactiveILRequest(
  request: Omit<RetroactiveILRequest, 'id' | 'status' | 'requested_at'>
): RetroactiveILRequest {
  const newRequest: RetroactiveILRequest = {
    ...request,
    id: `retro_il_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    requested_at: new Date().toISOString(),
  };
  
  if (typeof window === 'undefined') return newRequest;
  
  try {
    const requests = getRetroactiveILRequests();
    requests.unshift(newRequest);
    localStorage.setItem(RETROACTIVE_IL_KEY, JSON.stringify(requests));
    console.log('Submitted retroactive IL request:', newRequest.id);
  } catch (e) {
    console.error('Error submitting retroactive IL request:', e);
  }
  
  return newRequest;
}

// Approve a retroactive IL request (commissioner only)
export async function approveRetroactiveILRequest(
  requestId: string,
  reviewerId: string,
  reviewNotes?: string
): Promise<{ success: boolean; placement?: DBILPlacement; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot process on server' };
  }
  
  try {
    const requests = getRetroactiveILRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return { success: false, error: 'Request not found' };
    }
    
    const request = requests[requestIndex];
    
    // Create the actual IL placement
    const placementId = `il_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const placementResult = await addILPlacement({
      id: placementId,
      team_id: request.team_id,
      player_id: request.player_id,
      player_name: request.player_name,
      player_position: request.player_position,
      player_type: request.player_type,
      injury_type: request.injury_type,
      start_game: request.requested_start_game,
      start_date: request.requested_start_date,
      end_game: null,
      end_date: null,
      games_on_il: 0,
      status: 'active',
      created_by: request.requested_by,
    });
    
    if (!placementResult.success) {
      return { success: false, error: placementResult.error };
    }
    
    // Update the request status
    requests[requestIndex] = {
      ...request,
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    };
    
    localStorage.setItem(RETROACTIVE_IL_KEY, JSON.stringify(requests));
    console.log('Approved retroactive IL request:', requestId);
    
    return { success: true, placement: placementResult.placement };
  } catch (e: any) {
    console.error('Error approving retroactive IL request:', e);
    return { success: false, error: e.message || 'Failed to approve request' };
  }
}

// Deny a retroactive IL request (commissioner only)
export function denyRetroactiveILRequest(
  requestId: string,
  reviewerId: string,
  reviewNotes?: string
): { success: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot process on server' };
  }
  
  try {
    const requests = getRetroactiveILRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return { success: false, error: 'Request not found' };
    }
    
    requests[requestIndex] = {
      ...requests[requestIndex],
      status: 'denied',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || 'Request denied by commissioner',
    };
    
    localStorage.setItem(RETROACTIVE_IL_KEY, JSON.stringify(requests));
    console.log('Denied retroactive IL request:', requestId);
    
    return { success: true };
  } catch (e: any) {
    console.error('Error denying retroactive IL request:', e);
    return { success: false, error: e.message || 'Failed to deny request' };
  }
}

// =============================================================================
// SCOUTING REPORTS
// =============================================================================

export interface DBScoutingReport {
  id: string;
  user_id: string;
  team_id: string;
  opponent_team_id: string;
  analysis_type: 'hitting' | 'pitching';
  pitches_struggled: string[];
  pitches_hit_well: string[];
  batting_avg_by_pitch: Record<string, string>;
  tendencies: string[];
  recommendations: string[];
  raw_analysis: string;
  screenshot_url: string | null;
  created_at: string;
}

export async function saveScoutingReport(
  report: Omit<DBScoutingReport, 'id' | 'created_at'>
): Promise<{ success: boolean; report?: DBScoutingReport; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('scouting_reports')
      .insert({
        user_id: report.user_id,
        team_id: report.team_id,
        opponent_team_id: report.opponent_team_id,
        analysis_type: report.analysis_type,
        pitches_struggled: report.pitches_struggled,
        pitches_hit_well: report.pitches_hit_well,
        batting_avg_by_pitch: report.batting_avg_by_pitch,
        tendencies: report.tendencies,
        recommendations: report.recommendations,
        raw_analysis: report.raw_analysis,
        screenshot_url: report.screenshot_url,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving scouting report:', error);
      return { success: false, error: error.message };
    }

    return { success: true, report: data };
  } catch (err: any) {
    console.error('Error saving scouting report:', err);
    return { success: false, error: err.message || 'Failed to save report' };
  }
}

export async function getScoutingReports(userId: string): Promise<DBScoutingReport[]> {
  try {
    const { data, error } = await supabase
      .from('scouting_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scouting reports:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching scouting reports:', err);
    return [];
  }
}

export async function getOpponentReports(userId: string, opponentTeamId: string): Promise<DBScoutingReport[]> {
  try {
    const { data, error } = await supabase
      .from('scouting_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('opponent_team_id', opponentTeamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching opponent reports:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching opponent reports:', err);
    return [];
  }
}

// Get all scouting reports for admin view (league-wide intel)
export async function getAllScoutingReports(): Promise<DBScoutingReport[]> {
  try {
    const { data, error } = await supabase
      .from('scouting_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all scouting reports:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching all scouting reports:', err);
    return [];
  }
}

// Get aggregated intel on a specific team (for admin)
export async function getTeamIntel(teamId: string): Promise<{
  totalReports: number;
  commonWeaknesses: string[];
  commonStrengths: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('scouting_reports')
      .select('*')
      .eq('opponent_team_id', teamId);

    if (error || !data) {
      return { totalReports: 0, commonWeaknesses: [], commonStrengths: [] };
    }

    // Aggregate weaknesses
    const weaknessCounts: Record<string, number> = {};
    const strengthCounts: Record<string, number> = {};

    data.forEach(report => {
      report.pitches_struggled?.forEach((pitch: string) => {
        weaknessCounts[pitch] = (weaknessCounts[pitch] || 0) + 1;
      });
      report.pitches_hit_well?.forEach((pitch: string) => {
        strengthCounts[pitch] = (strengthCounts[pitch] || 0) + 1;
      });
    });

    const sortByCount = (counts: Record<string, number>) => 
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pitch]) => pitch);

    return {
      totalReports: data.length,
      commonWeaknesses: sortByCount(weaknessCounts),
      commonStrengths: sortByCount(strengthCounts),
    };
  } catch (err) {
    console.error('Error getting team intel:', err);
    return { totalReports: 0, commonWeaknesses: [], commonStrengths: [] };
  }
}

// =============================================================================
// MEMBER MANAGEMENT SYSTEM
// =============================================================================

// Registration Queue - Players awaiting approval
export interface DBRegistrationRequest {
  id: string;
  username: string;
  display_name: string;
  email: string;
  phone: string;
  psn_id?: string;
  discord_username?: string;
  requested_team_id: string;
  approval_code?: string;
  password?: string; // User's chosen password (stored temporarily until approval)
  target_league_id?: string; // League ID if using a league-specific approval code
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export async function getRegistrationQueue(): Promise<DBRegistrationRequest[]> {
  try {
    const { data, error } = await supabase
      .from('registration_queue')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching registration queue:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching registration queue:', err);
    return [];
  }
}

// League-specific approval codes
// These can be given to directors to share with applicants for direct league placement
export const LEAGUE_APPROVAL_CODES: Record<string, { leagueId: string; leagueName: string }> = {
  // Commissioner codes - direct to majors
  'MAJORS-VIP': { leagueId: 'majors', leagueName: 'Majors' },
  'FAST-TRACK': { leagueId: 'majors', leagueName: 'Majors' },
  // Director codes - minor leagues
  'TRIPLE-A-2024': { leagueId: 'triple-a', leagueName: 'Triple-A' },
  'AAA-MIGUEL': { leagueId: 'triple-a', leagueName: 'Triple-A' },
  'DOUBLE-A-2024': { leagueId: 'double-a', leagueName: 'Double-A' },
  'AA-ROY': { leagueId: 'double-a', leagueName: 'Double-A' },
  'SINGLE-A-2024': { leagueId: 'single-a', leagueName: 'Single-A' },
  'ROOKIE-START': { leagueId: 'rookie', leagueName: 'Rookie Ball' },
  'ROOKIE-2024': { leagueId: 'rookie', leagueName: 'Rookie Ball' },
};

export function getLeagueFromApprovalCode(code: string): { leagueId: string; leagueName: string } | null {
  const upperCode = code.toUpperCase().trim();
  return LEAGUE_APPROVAL_CODES[upperCode] || null;
}

export async function addRegistrationRequest(
  request: Omit<DBRegistrationRequest, 'id' | 'created_at' | 'status'>
): Promise<{ success: boolean; request?: DBRegistrationRequest; error?: string }> {
  try {
    // Check if approval code maps to a specific league
    let targetLeagueId = request.target_league_id;
    if (request.approval_code && !targetLeagueId) {
      const leagueMapping = getLeagueFromApprovalCode(request.approval_code);
      if (leagueMapping) {
        targetLeagueId = leagueMapping.leagueId;
      }
    }

    console.log('[Registration] Attempting to submit registration for:', request.username);
    
    const { data, error } = await supabase
      .from('registration_queue')
      .insert({
        ...request,
        target_league_id: targetLeagueId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[Registration] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Provide more specific error messages based on error codes
      if (error.code === '23505') {
        return { success: false, error: 'An account with this username or email already exists.' };
      }
      if (error.code === '42501' || error.message?.includes('RLS')) {
        return { success: false, error: 'Registration is temporarily unavailable. Please contact the commissioner.' };
      }
      if (error.code === '42P01') {
        return { success: false, error: 'Registration system is being set up. Please try again later or contact the commissioner.' };
      }
      
      return { success: false, error: error.message };
    }

    console.log('[Registration] Successfully submitted registration for:', request.username);
    return { success: true, request: data };
  } catch (err: any) {
    console.error('[Registration] Exception:', err);
    return { success: false, error: err.message || 'Failed to submit request' };
  }
}

export async function updateRegistrationRequest(
  id: string,
  updates: Partial<DBRegistrationRequest>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('registration_queue')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating registration request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error updating registration request:', err);
    return { success: false, error: err.message || 'Failed to update request' };
  }
}

export async function deleteRegistrationRequest(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('registration_queue')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting registration request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting registration request:', err);
    return { success: false, error: err.message || 'Failed to delete request' };
  }
}

// Ban List - Blocked players who cannot re-register
export interface DBBannedPlayer {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  psn_id?: string;
  discord_username?: string;
  original_team_id?: string;
  ban_type: 'removed' | 'banned'; // removed = can appeal, banned = permanent
  ban_reason: string;
  banned_at: string;
  banned_by: string;
  can_appeal: boolean;
  appeal_notes?: string;
}

export async function getBanList(): Promise<DBBannedPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('ban_list')
      .select('*')
      .order('banned_at', { ascending: false });

    if (error) {
      console.error('Error fetching ban list:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching ban list:', err);
    return [];
  }
}

export async function addToBanList(
  player: Omit<DBBannedPlayer, 'id' | 'banned_at'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('ban_list')
      .insert({
        ...player,
        banned_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error adding to ban list:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error adding to ban list:', err);
    return { success: false, error: err.message || 'Failed to add to ban list' };
  }
}

export async function removeFromBanList(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('ban_list')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing from ban list:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error removing from ban list:', err);
    return { success: false, error: err.message || 'Failed to remove from ban list' };
  }
}

// Check if a user is banned (by username, email, or phone)
export async function checkIfBanned(
  username?: string,
  email?: string,
  phone?: string,
  psnId?: string
): Promise<{ isBanned: boolean; banInfo?: DBBannedPlayer }> {
  try {
    // Build OR query for any matching identifier
    let query = supabase.from('ban_list').select('*');
    
    const conditions: string[] = [];
    if (username) conditions.push(`username.eq.${username.toLowerCase()}`);
    if (email) conditions.push(`email.eq.${email.toLowerCase()}`);
    if (phone) conditions.push(`phone.eq.${phone}`);
    if (psnId) conditions.push(`psn_id.eq.${psnId.toLowerCase()}`);
    
    if (conditions.length === 0) {
      return { isBanned: false };
    }

    // Check each condition separately (Supabase OR is tricky)
    for (const field of ['username', 'email', 'phone', 'psn_id']) {
      const value = field === 'username' ? username?.toLowerCase() :
                    field === 'email' ? email?.toLowerCase() :
                    field === 'phone' ? phone :
                    psnId?.toLowerCase();
      
      if (!value) continue;
      
      const { data, error } = await supabase
        .from('ban_list')
        .select('*')
        .eq(field, value)
        .single();
      
      if (data && !error) {
        return { isBanned: true, banInfo: data };
      }
    }

    return { isBanned: false };
  } catch (err) {
    console.error('Error checking ban status:', err);
    return { isBanned: false };
  }
}

// Team Status - Track team availability
export type TeamStatus = 'occupied' | 'open' | 'reserved';

export interface DBTeamStatus {
  team_id: string;
  status: TeamStatus;
  occupied_by?: string; // user_id
  reserved_for?: string; // Name or reason
  reserved_until?: string;
  notes?: string;
  updated_at: string;
}

export async function getTeamStatuses(): Promise<DBTeamStatus[]> {
  try {
    const { data, error } = await supabase
      .from('team_statuses')
      .select('*');

    if (error) {
      console.error('Error fetching team statuses:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching team statuses:', err);
    return [];
  }
}

export async function updateTeamStatus(
  teamId: string,
  updates: Partial<DBTeamStatus>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Upsert - insert or update
    const { error } = await supabase
      .from('team_statuses')
      .upsert({
        team_id: teamId,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'team_id' });

    if (error) {
      console.error('Error updating team status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error updating team status:', err);
    return { success: false, error: err.message || 'Failed to update team status' };
  }
}

// Member Activity Tracking
export interface DBMemberActivity {
  id: string;
  user_id: string;
  team_id: string;
  activity_type: 'game_played' | 'game_recap' | 'analysis_upload' | 'login' | 'il_move';
  metadata?: Record<string, any>;
  created_at: string;
}

export async function logMemberActivity(
  activity: Omit<DBMemberActivity, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('member_activity')
      .insert(activity);

    if (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error logging activity:', err);
    return { success: false, error: err.message || 'Failed to log activity' };
  }
}

export async function getMemberActivity(
  userId?: string,
  teamId?: string,
  startDate?: string,
  endDate?: string
): Promise<DBMemberActivity[]> {
  try {
    let query = supabase
      .from('member_activity')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (teamId) query = query.eq('team_id', teamId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching member activity:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching member activity:', err);
    return [];
  }
}

// Get activity summary for a period (e.g., weekly activity check)
export async function getActivitySummary(
  startDate: string,
  endDate: string
): Promise<Record<string, { gamesPlayed: number; recapsCreated: number; analysisUploads: number; wins: number; losses: number; lastActive: string; winRate: number }>> {
  try {
    // Aggregate by user
    const summary: Record<string, { gamesPlayed: number; recapsCreated: number; analysisUploads: number; wins: number; losses: number; lastActive: string; winRate: number }> = {};
    
    // First, get data from member_activity table
    const { data: activityData, error: activityError } = await supabase
      .from('member_activity')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (activityError) {
      console.error('Error fetching member_activity:', activityError);
    }
    
    (activityData || []).forEach(activity => {
      if (!summary[activity.user_id]) {
        summary[activity.user_id] = {
          gamesPlayed: 0,
          recapsCreated: 0,
          analysisUploads: 0,
          wins: 0,
          losses: 0,
          lastActive: activity.created_at,
          winRate: 0,
        };
      }
      
      const userSummary = summary[activity.user_id];
      
      switch (activity.activity_type) {
        case 'game_recap':
          userSummary.recapsCreated++;
          break;
        case 'analysis_upload':
          userSummary.analysisUploads++;
          break;
      }
      
      // Track most recent activity
      if (activity.created_at > userSummary.lastActive) {
        userSummary.lastActive = activity.created_at;
      }
    });

    // Second, get actual game data from game_logs table (more accurate)
    const { data: gameData, error: gameError } = await supabase
      .from('game_logs')
      .select('user_id, is_win, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .gte('game_date', CURRENT_SEASON_GAME_MIN_DATE);

    if (gameError) {
      console.error('Error fetching game_logs:', gameError);
    }

    (gameData || []).forEach(game => {
      if (!summary[game.user_id]) {
        summary[game.user_id] = {
          gamesPlayed: 0,
          recapsCreated: 0,
          analysisUploads: 0,
          wins: 0,
          losses: 0,
          lastActive: game.created_at,
          winRate: 0,
        };
      }
      
      const userSummary = summary[game.user_id];
      userSummary.gamesPlayed++;
      
      if (game.is_win) {
        userSummary.wins++;
      } else {
        userSummary.losses++;
      }
      
      // Track most recent activity
      if (game.created_at > userSummary.lastActive) {
        userSummary.lastActive = game.created_at;
      }
    });

    // Calculate win rates
    Object.values(summary).forEach(userSummary => {
      if (userSummary.gamesPlayed > 0) {
        userSummary.winRate = Math.round((userSummary.wins / userSummary.gamesPlayed) * 100);
      }
    });

    return summary;
  } catch (err) {
    console.error('Error fetching activity summary:', err);
    return {};
  }
}

// Welcome Packet - Store welcome message templates
export interface DBWelcomePacket {
  id: string;
  title: string;
  /** May be null in DB even when a row exists */
  welcome_message: string | null;
  rules_link?: string;
  discord_link?: string;
  facebook_link?: string;
  schedule_link?: string;
  is_active: boolean;
  updated_at: string;
}

export async function getWelcomePacket(): Promise<DBWelcomePacket | null> {
  try {
    const { data, error } = await supabase
      .from('welcome_packets')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching welcome packet:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching welcome packet:', err);
    return null;
  }
}

export async function saveWelcomePacket(
  packet: Omit<DBWelcomePacket, 'id' | 'updated_at'>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Deactivate all existing packets first
    await supabase
      .from('welcome_packets')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new packet
    const { error } = await supabase
      .from('welcome_packets')
      .insert({
        ...packet,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving welcome packet:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving welcome packet:', err);
    return { success: false, error: err.message || 'Failed to save welcome packet' };
  }
}

// =============================================================================
// REWARDS & GAMIFICATION SYSTEM
// =============================================================================

export interface DBPlayerRewards {
  id: string;
  user_id: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  games_played: number;
  recaps_created: number;
  analyses_uploaded: number;
  badges: string[]; // Array of badge IDs
  created_at: string;
  updated_at: string;
}

export interface DBBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'games' | 'recaps' | 'analyses' | 'streaks' | 'special';
  requirement_value: number;
  points_value: number;
}

// Define all available badges
export const BADGES: DBBadge[] = [
  // Games Played Badges
  { id: 'first_game', name: 'First Game', description: 'Log your first game', icon: '🎮', category: 'games', requirement_value: 1, points_value: 10 },
  { id: 'games_10', name: 'Getting Started', description: 'Play 10 games', icon: '🌟', category: 'games', requirement_value: 10, points_value: 50 },
  { id: 'games_25', name: 'Regular', description: 'Play 25 games', icon: '⭐', category: 'games', requirement_value: 25, points_value: 100 },
  { id: 'games_50', name: 'Veteran', description: 'Play 50 games', icon: '🏆', category: 'games', requirement_value: 50, points_value: 200 },
  { id: 'games_100', name: 'Legend', description: 'Play 100 games', icon: '👑', category: 'games', requirement_value: 100, points_value: 500 },
  
  // Recaps Created Badges
  { id: 'first_recap', name: 'Storyteller', description: 'Create your first recap', icon: '📝', category: 'recaps', requirement_value: 1, points_value: 15 },
  { id: 'recaps_10', name: 'Reporter', description: 'Create 10 recaps', icon: '📰', category: 'recaps', requirement_value: 10, points_value: 75 },
  { id: 'recaps_25', name: 'Journalist', description: 'Create 25 recaps', icon: '✍️', category: 'recaps', requirement_value: 25, points_value: 150 },
  
  // Analyses Uploaded Badges
  { id: 'first_analysis', name: 'Student', description: 'Upload your first analysis', icon: '📊', category: 'analyses', requirement_value: 1, points_value: 20 },
  { id: 'analyses_10', name: 'Analyst', description: 'Upload 10 analyses', icon: '🔬', category: 'analyses', requirement_value: 10, points_value: 100 },
  { id: 'analyses_25', name: 'Scout Master', description: 'Upload 25 analyses', icon: '🎯', category: 'analyses', requirement_value: 25, points_value: 200 },
  
  // Streak Badges
  { id: 'streak_3', name: 'On Fire', description: '3-day activity streak', icon: '🔥', category: 'streaks', requirement_value: 3, points_value: 25 },
  { id: 'streak_7', name: 'Weekly Warrior', description: '7-day activity streak', icon: '💪', category: 'streaks', requirement_value: 7, points_value: 75 },
  { id: 'streak_14', name: 'Dedicated', description: '14-day activity streak', icon: '🌊', category: 'streaks', requirement_value: 14, points_value: 150 },
  { id: 'streak_30', name: 'Iron Will', description: '30-day activity streak', icon: '⚡', category: 'streaks', requirement_value: 30, points_value: 300 },
];

// Get player rewards
export async function getPlayerRewards(userId: string): Promise<DBPlayerRewards | null> {
  try {
    const { data, error } = await supabase
      .from('player_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If not found, return null (will create when needed)
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching player rewards:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching player rewards:', err);
    return null;
  }
}

// Initialize or update player rewards
export async function updatePlayerRewards(
  userId: string,
  updates: Partial<DBPlayerRewards>
): Promise<{ success: boolean; rewards?: DBPlayerRewards; newBadges?: string[]; error?: string }> {
  try {
    // Get existing rewards
    const existing = await getPlayerRewards(userId);
    
    if (!existing) {
      // Create new record
      const newRewards: Omit<DBPlayerRewards, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        total_points: updates.total_points || 0,
        current_streak: updates.current_streak || 0,
        longest_streak: updates.longest_streak || 0,
        last_activity_date: updates.last_activity_date || new Date().toISOString().split('T')[0],
        games_played: updates.games_played || 0,
        recaps_created: updates.recaps_created || 0,
        analyses_uploaded: updates.analyses_uploaded || 0,
        badges: updates.badges || [],
      };

      const { data, error } = await supabase
        .from('player_rewards')
        .insert(newRewards)
        .select()
        .single();

      if (error) {
        console.error('Error creating player rewards:', error);
        return { success: false, error: error.message };
      }

      return { success: true, rewards: data, newBadges: [] };
    }

    // Update existing record
    const { data, error } = await supabase
      .from('player_rewards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating player rewards:', error);
      return { success: false, error: error.message };
    }

    return { success: true, rewards: data, newBadges: [] };
  } catch (err: any) {
    console.error('Error updating player rewards:', err);
    return { success: false, error: err.message || 'Failed to update rewards' };
  }
}

// Award activity and check for new badges
export async function awardActivity(
  userId: string,
  activityType: 'game_played' | 'game_recap' | 'analysis_upload'
): Promise<{ success: boolean; pointsEarned: number; newBadges: DBBadge[]; error?: string }> {
  try {
    let existing = await getPlayerRewards(userId);
    const today = new Date().toISOString().split('T')[0];
    const newBadges: DBBadge[] = [];
    let pointsEarned = 0;

    // Initialize if no record exists
    if (!existing) {
      const init = await updatePlayerRewards(userId, {
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: today,
        games_played: 0,
        recaps_created: 0,
        analyses_uploaded: 0,
        badges: [],
      });
      existing = init.rewards || null;
    }

    if (!existing) {
      return { success: false, pointsEarned: 0, newBadges: [], error: 'Failed to initialize rewards' };
    }

    // Calculate streak
    let newStreak = existing.current_streak;
    const lastDate = existing.last_activity_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (lastDate === yesterday) {
      newStreak = existing.current_streak + 1;
    } else if (lastDate !== today) {
      newStreak = 1; // Reset streak
    }

    // Update counts based on activity type
    let gamesPlayed = existing.games_played;
    let recapsCreated = existing.recaps_created;
    let analysesUploaded = existing.analyses_uploaded;

    // Points per activity
    const POINTS = {
      game_played: 5,
      game_recap: 10,
      analysis_upload: 15,
    };

    pointsEarned = POINTS[activityType];

    switch (activityType) {
      case 'game_played':
        gamesPlayed++;
        break;
      case 'game_recap':
        recapsCreated++;
        break;
      case 'analysis_upload':
        analysesUploaded++;
        break;
    }

    // Check for new badges
    const currentBadges = existing.badges || [];
    
    // Games badges
    const gamesBadges = BADGES.filter(b => b.category === 'games' && gamesPlayed >= b.requirement_value && !currentBadges.includes(b.id));
    // Recaps badges  
    const recapsBadges = BADGES.filter(b => b.category === 'recaps' && recapsCreated >= b.requirement_value && !currentBadges.includes(b.id));
    // Analyses badges
    const analysesBadges = BADGES.filter(b => b.category === 'analyses' && analysesUploaded >= b.requirement_value && !currentBadges.includes(b.id));
    // Streak badges
    const streakBadges = BADGES.filter(b => b.category === 'streaks' && newStreak >= b.requirement_value && !currentBadges.includes(b.id));

    const allNewBadges = [...gamesBadges, ...recapsBadges, ...analysesBadges, ...streakBadges];
    newBadges.push(...allNewBadges);

    // Add points from new badges
    allNewBadges.forEach(badge => {
      pointsEarned += badge.points_value;
    });

    // Update record
    const updatedBadges = [...currentBadges, ...allNewBadges.map(b => b.id)];
    const newLongestStreak = Math.max(existing.longest_streak, newStreak);

    await updatePlayerRewards(userId, {
      total_points: existing.total_points + pointsEarned,
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      last_activity_date: today,
      games_played: gamesPlayed,
      recaps_created: recapsCreated,
      analyses_uploaded: analysesUploaded,
      badges: updatedBadges,
    });

    return { success: true, pointsEarned, newBadges };
  } catch (err: any) {
    console.error('Error awarding activity:', err);
    return { success: false, pointsEarned: 0, newBadges: [], error: err.message };
  }
}

// Get leaderboard
export async function getLeaderboard(limit: number = 10): Promise<DBPlayerRewards[]> {
  try {
    const { data, error } = await supabase
      .from('player_rewards')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return [];
  }
}

// =============================================================================
// GAME STATS TRACKING
// =============================================================================

export interface DBGameResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_team_id: string;
  loser_team_id: string;
  home_user_id?: string;
  away_user_id?: string;
  game_date: string;
  season?: string;
  notes?: string;
  key_players?: Record<string, string>;
  created_at: string;
  created_by?: string;
}

export interface TeamStats {
  teamId: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  currentStreak: number;
  streakType: 'W' | 'L' | 'none';
  lastGames: Array<{ opponent: string; result: 'W' | 'L'; score: string }>;
}

// Record a game result
export async function recordGameResult(
  result: Omit<DBGameResult, 'id' | 'created_at' | 'winner_team_id' | 'loser_team_id'>
): Promise<{ success: boolean; gameResult?: DBGameResult; error?: string }> {
  try {
    const winnerId = result.home_score > result.away_score ? result.home_team_id : result.away_team_id;
    const loserId = result.home_score > result.away_score ? result.away_team_id : result.home_team_id;

    const { data, error } = await supabase
      .from('game_results')
      .insert({
        ...result,
        winner_team_id: winnerId,
        loser_team_id: loserId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording game result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, gameResult: data };
  } catch (err: any) {
    console.error('Error recording game result:', err);
    return { success: false, error: err.message || 'Failed to record game result' };
  }
}

// Get game results
export async function getGameResults(
  teamId?: string,
  limit: number = 50
): Promise<DBGameResult[]> {
  try {
    let query = supabase
      .from('game_results')
      .select('*')
      .order('game_date', { ascending: false })
      .limit(limit);

    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching game results:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching game results:', err);
    return [];
  }
}

// Calculate team standings/stats
export async function getTeamStats(teamId: string): Promise<TeamStats> {
  try {
    const games = await getGameResults(teamId, 162); // Full season

    const stats: TeamStats = {
      teamId,
      wins: 0,
      losses: 0,
      runsScored: 0,
      runsAllowed: 0,
      currentStreak: 0,
      streakType: 'none',
      lastGames: [],
    };

    games.forEach((game, index) => {
      const isHome = game.home_team_id === teamId;
      const won = game.winner_team_id === teamId;
      const scored = isHome ? game.home_score : game.away_score;
      const allowed = isHome ? game.away_score : game.home_score;
      const opponent = isHome ? game.away_team_id : game.home_team_id;

      if (won) stats.wins++;
      else stats.losses++;

      stats.runsScored += scored;
      stats.runsAllowed += allowed;

      // Track last 10 games
      if (index < 10) {
        stats.lastGames.push({
          opponent,
          result: won ? 'W' : 'L',
          score: isHome ? `${game.home_score}-${game.away_score}` : `${game.away_score}-${game.home_score}`,
        });
      }
    });

    // Calculate current streak
    if (stats.lastGames.length > 0) {
      const firstResult = stats.lastGames[0].result;
      stats.streakType = firstResult;
      stats.currentStreak = 1;

      for (let i = 1; i < stats.lastGames.length; i++) {
        if (stats.lastGames[i].result === firstResult) {
          stats.currentStreak++;
        } else {
          break;
        }
      }
    }

    return stats;
  } catch (err) {
    console.error('Error calculating team stats:', err);
    return {
      teamId,
      wins: 0,
      losses: 0,
      runsScored: 0,
      runsAllowed: 0,
      currentStreak: 0,
      streakType: 'none',
      lastGames: [],
    };
  }
}

// Get league standings
export async function getLeagueStandings(): Promise<TeamStats[]> {
  try {
    const { data: allGames, error } = await supabase
      .from('game_results')
      .select('*')
      .order('game_date', { ascending: false });

    if (error) {
      console.error('Error fetching standings:', error);
      return [];
    }

    // Get unique team IDs
    const teamIds = new Set<string>();
    (allGames || []).forEach(game => {
      teamIds.add(game.home_team_id);
      teamIds.add(game.away_team_id);
    });

    // Calculate stats for each team
    const standings: TeamStats[] = [];
    const teamIdArray = Array.from(teamIds);

    for (let i = 0; i < teamIdArray.length; i++) {
      const stats = await getTeamStats(teamIdArray[i]);
      standings.push(stats);
    }

    // Sort by wins, then by run differential
    standings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aRunDiff = a.runsScored - a.runsAllowed;
      const bRunDiff = b.runsScored - b.runsAllowed;
      return bRunDiff - aRunDiff;
    });

    return standings;
  } catch (err) {
    console.error('Error fetching standings:', err);
    return [];
  }
}

// =============================================================================
// USER ONBOARDING
// =============================================================================

export interface DBUserOnboarding {
  id: string;
  user_id: string;
  rules_acknowledged: boolean;
  rules_acknowledged_at: string | null;
  welcome_viewed: boolean;
  welcome_viewed_at: string | null;
  discord_joined: boolean;
  facebook_joined: boolean;
  psn_friends_added: boolean;
  sms_registered: boolean;
  sms_registered_at: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
}

// Get user's onboarding status
export async function getUserOnboarding(userId: string): Promise<DBUserOnboarding | null> {
  try {
    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no record exists, that's okay
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching user onboarding:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching user onboarding:', err);
    return null;
  }
}

// Initialize user onboarding record
export async function initUserOnboarding(userId: string): Promise<DBUserOnboarding | null> {
  try {
    const { data, error } = await supabase
      .from('user_onboarding')
      .insert({
        user_id: userId,
        rules_acknowledged: false,
        welcome_viewed: false,
        discord_joined: false,
        facebook_joined: false,
        psn_friends_added: false,
        sms_registered: false,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error initializing user onboarding:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error initializing user onboarding:', err);
    return null;
  }
}

// Update user onboarding status
export async function updateUserOnboarding(
  userId: string,
  updates: Partial<DBUserOnboarding>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if record exists
    const existing = await getUserOnboarding(userId);
    
    if (!existing) {
      // Create initial record with the updates included
      const initialData = {
        user_id: userId,
        rules_acknowledged: false,
        welcome_viewed: false,
        discord_joined: false,
        facebook_joined: false,
        psn_friends_added: false,
        sms_registered: false,
        onboarding_completed: false,
        ...updates, // Apply the updates to the initial record
      };
      
      const { error: insertError } = await supabase
        .from('user_onboarding')
        .insert(initialData);

      if (insertError) {
        console.error('Error creating user onboarding record:', insertError);
        return { success: false, error: insertError.message };
      }
      
      return { success: true };
    }

    // Record exists, update it
    const { error } = await supabase
      .from('user_onboarding')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user onboarding:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error updating user onboarding:', err);
    return { success: false, error: err.message || 'Failed to update onboarding' };
  }
}

// Mark rules as acknowledged
export async function acknowledgeRules(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateUserOnboarding(userId, {
    rules_acknowledged: true,
    rules_acknowledged_at: new Date().toISOString(),
  });
}

// Mark SMS registration as completed
export async function markSmsRegistered(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateUserOnboarding(userId, {
    sms_registered: true,
    sms_registered_at: new Date().toISOString(),
  });
}

// LocalStorage key for onboarding backup
const ONBOARDING_COMPLETE_KEY = 'jkap_onboarding_complete';

// Check localStorage for onboarding completion (fallback)
function isOnboardingCompleteLocally(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data[userId] === true;
    }
  } catch (e) {
    console.error('Error reading onboarding localStorage:', e);
  }
  return false;
}

// Save onboarding completion to localStorage (fallback)
function setOnboardingCompleteLocally(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[userId] = true;
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(data));
    console.log('Onboarding saved to localStorage for user:', userId);
  } catch (e) {
    console.error('Error saving onboarding to localStorage:', e);
  }
}

// Check if user needs to complete onboarding
// NOTE: Only users created AFTER the onboarding system was added need to complete it
// Existing users are "grandfathered in" and don't need onboarding
export async function needsOnboarding(userId: string): Promise<boolean> {
  try {
    // FIRST: Check localStorage fallback (most reliable)
    if (isOnboardingCompleteLocally(userId)) {
      console.log('Onboarding complete (localStorage) for user:', userId);
      return false;
    }
    
    // Second: Check database record
    const onboarding = await getUserOnboarding(userId);
    
    // If they have a record and completed it, they're done
    if (onboarding?.onboarding_completed) {
      // Also save to localStorage for redundancy
      setOnboardingCompleteLocally(userId);
      return false;
    }
    
    // Check when the user was created
    const { data: user, error } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      // Can't verify user, skip onboarding to avoid loops
      console.log('Cannot verify user, skipping onboarding check');
      return false;
    }
    
    // Onboarding system was added on 2026-01-13
    // Users created before this date are grandfathered in
    const onboardingLaunchDate = new Date('2026-01-14T00:00:00Z');
    const userCreatedAt = new Date(user.created_at);
    
    // If user was created before onboarding system, they don't need it
    if (userCreatedAt < onboardingLaunchDate) {
      // Auto-complete their onboarding so they're marked as done
      await completeOnboarding(userId);
      return false;
    }
    
    // New user needs onboarding
    return !onboarding?.onboarding_completed;
  } catch (err) {
    console.error('Error checking onboarding status:', err);
    // On error, don't block - skip onboarding
    return false;
  }
}

// Mark onboarding as complete
export async function completeOnboarding(userId: string): Promise<{ success: boolean; error?: string }> {
  // ALWAYS save to localStorage first (guaranteed to work)
  setOnboardingCompleteLocally(userId);
  
  // Then try to save to database
  const result = await updateUserOnboarding(userId, {
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
  });
  
  if (!result.success) {
    console.warn('Database save failed, but localStorage backup succeeded');
  }
  
  // Return success since localStorage worked even if DB failed
  return { success: true };
}

// Reset onboarding for a user (admin function)
export async function resetOnboarding(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear localStorage if we're in the browser
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          delete data[userId];
          localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(data));
          console.log('Cleared onboarding localStorage for user:', userId);
        }
      } catch (e) {
        console.error('Error clearing onboarding localStorage:', e);
      }
    }
    
    // Delete the database record so they start fresh
    const { error } = await supabase
      .from('user_onboarding')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error resetting onboarding in database:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Onboarding reset for user:', userId);
    return { success: true };
  } catch (err: any) {
    console.error('Error resetting onboarding:', err);
    return { success: false, error: err.message || 'Failed to reset onboarding' };
  }
}

// Get all users' onboarding status (for admin)
export async function getAllOnboardingStatuses(): Promise<(DBUserOnboarding & { username?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all onboarding statuses:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching all onboarding statuses:', err);
    return [];
  }
}

// =============================================================================
// GAME LOGGING & LEADERBOARDS
// =============================================================================

export interface DBGameLog {
  id: string;
  user_id: string;
  user_team_id: string;
  opponent_team_id: string;
  user_score: number;
  opponent_score: number;
  is_win: boolean;
  game_number?: number;
  game_date: string;
  winning_pitcher?: string;
  losing_pitcher?: string;
  save_pitcher?: string;
  user_strikeouts?: number;
  home_runs_hit?: { player: string; count: number }[];
  total_home_runs: number;
  total_hits?: number;
  total_rbis?: number;
  notes?: string;
  recap_generated?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBPlayerStats {
  id: string;
  player_name: string;
  team_id: string;
  user_id: string;
  home_runs: number;
  strikeouts_pitched: number;
  pitching_wins: number;
  pitching_losses: number;
  saves: number;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_name?: string;
  team_id: string;
  user_id: string;
  value: number;
  display_name?: string;
}

// Token rewards for game logging
const TOKEN_REWARDS = {
  GAME_LOGGED: 5,
  WIN_BONUS: 10,
  HOME_RUN: 2,
  WIN_STREAK_BONUS: 15, // 3+ win streak
  FIRST_GAME_OF_DAY: 5,
};

// Log a game and award tokens
export async function logGame(
  gameData: Omit<DBGameLog, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; gameLog?: DBGameLog; tokensEarned?: number; recapCreditsEarned?: number; error?: string }> {
  try {
    // Insert the game log
    const { data, error } = await supabase
      .from('game_logs')
      .insert({
        ...gameData,
        home_runs_hit: JSON.stringify(gameData.home_runs_hit || []),
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging game:', error);
      return { success: false, error: error.message };
    }

    // Calculate tokens earned
    let tokensEarned = TOKEN_REWARDS.GAME_LOGGED;
    
    if (gameData.is_win) {
      tokensEarned += TOKEN_REWARDS.WIN_BONUS;
    }
    
    tokensEarned += (gameData.total_home_runs || 0) * TOKEN_REWARDS.HOME_RUN;

    // Check if first game of the day
    const today = new Date().toISOString().split('T')[0];
    const { data: todayGames } = await supabase
      .from('game_logs')
      .select('id')
      .eq('user_id', gameData.user_id)
      .gte('created_at', today + 'T00:00:00')
      .lt('created_at', today + 'T23:59:59');

    if (!todayGames || todayGames.length <= 1) {
      tokensEarned += TOKEN_REWARDS.FIRST_GAME_OF_DAY;
    }

    // Update player rewards
    await updatePlayerRewardsFromGame(gameData.user_id, gameData, tokensEarned);

    // Update player stats if we have pitching info
    if (gameData.winning_pitcher && gameData.is_win) {
      await updatePlayerStat(gameData.user_id, gameData.user_team_id, gameData.winning_pitcher, 'pitching_wins', 1);
    }
    if (gameData.losing_pitcher && !gameData.is_win) {
      await updatePlayerStat(gameData.user_id, gameData.user_team_id, gameData.losing_pitcher, 'pitching_losses', 1);
    }
    if (gameData.save_pitcher) {
      await updatePlayerStat(gameData.user_id, gameData.user_team_id, gameData.save_pitcher, 'saves', 1);
    }

    // Update home run stats for each player
    if (gameData.home_runs_hit) {
      for (const hr of gameData.home_runs_hit) {
        await updatePlayerStat(gameData.user_id, gameData.user_team_id, hr.player, 'home_runs', hr.count);
      }
    }

    // Update user level stats for Road to the Show
    await updateUserLevelFromGame(gameData.user_id, gameData.is_win);

    // Award 1 recap credit for logging the game
    awardRecapCredit(gameData.user_id, 1);

    return { success: true, gameLog: data, tokensEarned, recapCreditsEarned: 1 };
  } catch (err: any) {
    console.error('Error logging game:', err);
    return { success: false, error: err.message || 'Failed to log game' };
  }
}

// Update player rewards from a logged game
async function updatePlayerRewardsFromGame(
  userId: string,
  gameData: Omit<DBGameLog, 'id' | 'created_at' | 'updated_at'>,
  tokensEarned: number
): Promise<number> {
  try {
    // Get current rewards
    const { data: current } = await supabase
      .from('player_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    let totalTokens = tokensEarned;

    if (current) {
      // Update existing record
      const newWinStreak = gameData.is_win ? (current.win_streak || 0) + 1 : 0;
      
      // Bonus for 3+ win streak
      if (newWinStreak >= 3 && gameData.is_win) {
        totalTokens += TOKEN_REWARDS.WIN_STREAK_BONUS;
      }

      await supabase
        .from('player_rewards')
        .update({
          tokens: (current.tokens || 0) + totalTokens,
          total_points: (current.total_points || 0) + totalTokens,
          games_played: (current.games_played || 0) + 1,
          win_streak: newWinStreak,
          longest_streak: Math.max(current.longest_streak || 0, newWinStreak),
          home_runs_logged: (current.home_runs_logged || 0) + (gameData.total_home_runs || 0),
          wins_logged: (current.wins_logged || 0) + (gameData.is_win ? 1 : 0),
          saves_logged: (current.saves_logged || 0) + (gameData.save_pitcher ? 1 : 0),
          last_activity_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // Create new record
      await supabase
        .from('player_rewards')
        .insert({
          user_id: userId,
          tokens: totalTokens,
          total_points: totalTokens,
          games_played: 1,
          win_streak: gameData.is_win ? 1 : 0,
          longest_streak: gameData.is_win ? 1 : 0,
          home_runs_logged: gameData.total_home_runs || 0,
          wins_logged: gameData.is_win ? 1 : 0,
          saves_logged: gameData.save_pitcher ? 1 : 0,
          last_activity_date: new Date().toISOString(),
        });
    }

    // Also add tokens to user_wallets for the wallet UI
    await addTokensInternal(userId, totalTokens, 'game_played', 
      `Game logged: ${gameData.is_win ? 'Win' : 'Loss'} vs ${gameData.opponent_team_id}`);

    return totalTokens;
  } catch (err) {
    console.error('Error updating player rewards:', err);
    return tokensEarned;
  }
}

// Internal function to add tokens to wallet (used by game logging)
async function addTokensInternal(
  userId: string,
  amount: number,
  transactionType: string,
  description?: string
): Promise<void> {
  try {
    // Get or create wallet
    let { data: wallet } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      // Create wallet
      const { data: newWallet } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          token_balance: 0,
          lifetime_tokens_earned: 0,
          lifetime_tokens_spent: 0,
        })
        .select()
        .single();
      wallet = newWallet;
    }

    if (!wallet) return;

    const newBalance = (wallet.token_balance || 0) + amount;

    // Update wallet
    await supabase
      .from('user_wallets')
      .update({
        token_balance: newBalance,
        lifetime_tokens_earned: (wallet.lifetime_tokens_earned || 0) + (amount > 0 ? amount : 0),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Record transaction
    await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount,
        balance_after: newBalance,
        transaction_type: transactionType,
        description,
      });
  } catch (err) {
    console.error('Error adding tokens to wallet:', err);
  }
}

// Update a specific player stat
async function updatePlayerStat(
  userId: string,
  teamId: string,
  playerName: string,
  stat: 'home_runs' | 'strikeouts_pitched' | 'pitching_wins' | 'pitching_losses' | 'saves',
  increment: number
): Promise<void> {
  try {
    // Check if player exists
    const { data: existing } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('player_name', playerName)
      .single();

    if (existing) {
      await supabase
        .from('player_stats')
        .update({
          [stat]: (existing[stat] || 0) + increment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('player_stats')
        .insert({
          user_id: userId,
          team_id: teamId,
          player_name: playerName,
          [stat]: increment,
        });
    }
  } catch (err) {
    console.error('Error updating player stat:', err);
  }
}

// Get game logs for a user or all users (default: current season only — see config/season-games.ts)
export async function getGameLogs(
  userId?: string,
  limit: number = 50,
  options?: { includePriorSeasons?: boolean }
): Promise<DBGameLog[]> {
  try {
    let query = supabase
      .from('game_logs')
      .select('*')
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!options?.includePriorSeasons) {
      query = query.gte('game_date', CURRENT_SEASON_GAME_MIN_DATE);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching game logs:', error);
      return [];
    }

    // Parse home_runs_hit JSON
    return (data || []).map(log => ({
      ...log,
      home_runs_hit: typeof log.home_runs_hit === 'string' 
        ? JSON.parse(log.home_runs_hit) 
        : log.home_runs_hit || [],
    }));
  } catch (err) {
    console.error('Error fetching game logs:', err);
    return [];
  }
}

// Delete a game log (user can only delete their own games)
export async function deleteGameLog(gameId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('game_logs')
      .delete()
      .eq('id', gameId)
      .eq('user_id', userId); // Ensure user can only delete their own games

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting game log:', err);
    return { success: false, error: err.message };
  }
}

// Get user's game stats summary
export async function getUserGameStats(userId: string): Promise<{
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: string;
  totalHomeRuns: number;
  totalStrikeouts: number;
  currentWinStreak: number;
  tokens: number;
}> {
  try {
    const { data: logs } = await supabase
      .from('game_logs')
      .select('is_win, total_home_runs, user_strikeouts, game_date, created_at')
      .eq('user_id', userId)
      .gte('game_date', CURRENT_SEASON_GAME_MIN_DATE)
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: rewards } = await supabase
      .from('player_rewards')
      .select('tokens, win_streak')
      .eq('user_id', userId)
      .single();

    const games = logs || [];
    const wins = games.filter(g => g.is_win).length;
    const losses = games.length - wins;
    const totalHRs = games.reduce((sum, g) => sum + (g.total_home_runs || 0), 0);
    const totalKs = games.reduce((sum, g) => sum + (g.user_strikeouts || 0), 0);

    let currentWinStreak = 0;
    for (const g of games) {
      if (g.is_win) currentWinStreak++;
      else break;
    }

    return {
      gamesPlayed: games.length,
      wins,
      losses,
      winPct: games.length > 0 ? (wins / games.length * 100).toFixed(1) : '0.0',
      totalHomeRuns: totalHRs,
      totalStrikeouts: totalKs,
      currentWinStreak,
      tokens: rewards?.tokens || 0,
    };
  } catch (err) {
    console.error('Error fetching user game stats:', err);
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winPct: '0.0',
      totalHomeRuns: 0,
      totalStrikeouts: 0,
      currentWinStreak: 0,
      tokens: 0,
    };
  }
}

// Get leaderboards
export async function getLeaderboards(): Promise<{
  homeRuns: LeaderboardEntry[];
  strikeouts: LeaderboardEntry[];
  wins: LeaderboardEntry[];
  saves: LeaderboardEntry[];
  gamesPlayed: LeaderboardEntry[];
}> {
  try {
    // Get all game logs aggregated by user (current season only)
    const { data: logs } = await supabase
      .from('game_logs')
      .select('user_id, user_team_id, is_win, total_home_runs, user_strikeouts, save_pitcher')
      .gte('game_date', CURRENT_SEASON_GAME_MIN_DATE);

    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, team_id');

    const userMap = new Map((users || []).map(u => [u.id, u]));

    // Aggregate stats by user
    const userStats = new Map<string, {
      userId: string;
      teamId: string;
      displayName: string;
      homeRuns: number;
      strikeouts: number;
      wins: number;
      saves: number;
      gamesPlayed: number;
    }>();

    (logs || []).forEach(log => {
      const existing = userStats.get(log.user_id) || {
        userId: log.user_id,
        teamId: log.user_team_id,
        displayName: userMap.get(log.user_id)?.display_name || 'Unknown',
        homeRuns: 0,
        strikeouts: 0,
        wins: 0,
        saves: 0,
        gamesPlayed: 0,
      };

      existing.homeRuns += log.total_home_runs || 0;
      existing.strikeouts += log.user_strikeouts || 0;
      existing.wins += log.is_win ? 1 : 0;
      existing.saves += log.save_pitcher ? 1 : 0;
      existing.gamesPlayed += 1;

      userStats.set(log.user_id, existing);
    });

    const statsArray = Array.from(userStats.values());

    // Create leaderboards
    const createLeaderboard = (
      sortKey: keyof typeof statsArray[0],
      limit: number = 10
    ): LeaderboardEntry[] => {
      return statsArray
        .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
        .slice(0, limit)
        .map((stat, index) => ({
          rank: index + 1,
          team_id: stat.teamId,
          user_id: stat.userId,
          value: stat[sortKey] as number,
          display_name: stat.displayName,
        }));
    };

    return {
      homeRuns: createLeaderboard('homeRuns'),
      strikeouts: createLeaderboard('strikeouts'),
      wins: createLeaderboard('wins'),
      saves: createLeaderboard('saves'),
      gamesPlayed: createLeaderboard('gamesPlayed'),
    };
  } catch (err) {
    console.error('Error fetching leaderboards:', err);
    return {
      homeRuns: [],
      strikeouts: [],
      wins: [],
      saves: [],
      gamesPlayed: [],
    };
  }
}

// Get player stats leaderboards (individual players)
export async function getPlayerLeaderboards(): Promise<{
  homeRuns: (DBPlayerStats & { display_name?: string })[];
  pitchingWins: (DBPlayerStats & { display_name?: string })[];
  saves: (DBPlayerStats & { display_name?: string })[];
}> {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name');

    const userMap = new Map((users || []).map(u => [u.id, u.display_name]));

    // Home run leaders
    const { data: hrLeaders } = await supabase
      .from('player_stats')
      .select('*')
      .gt('home_runs', 0)
      .order('home_runs', { ascending: false })
      .limit(10);

    // Pitching win leaders
    const { data: winLeaders } = await supabase
      .from('player_stats')
      .select('*')
      .gt('pitching_wins', 0)
      .order('pitching_wins', { ascending: false })
      .limit(10);

    // Save leaders
    const { data: saveLeaders } = await supabase
      .from('player_stats')
      .select('*')
      .gt('saves', 0)
      .order('saves', { ascending: false })
      .limit(10);

    const addDisplayName = (stats: DBPlayerStats[] | null) =>
      (stats || []).map(s => ({
        ...s,
        display_name: userMap.get(s.user_id) || 'Unknown',
      }));

    return {
      homeRuns: addDisplayName(hrLeaders),
      pitchingWins: addDisplayName(winLeaders),
      saves: addDisplayName(saveLeaders),
    };
  } catch (err) {
    console.error('Error fetching player leaderboards:', err);
    return {
      homeRuns: [],
      pitchingWins: [],
      saves: [],
    };
  }
}

// =============================================================================
// LEAGUE HIERARCHY SYSTEM ("Road to the Show")
// =============================================================================

export interface DBLeague {
  id: string;
  name: string;
  level: number;
  description: string;
  manager_name: string | null;
  monthly_salary: number;
  perks: string[];
  color: string;
  icon: string;
  min_games_to_qualify: number;
  min_win_rate: number;
  min_time_in_league_days: number;
  created_at: string;
}

export interface DBUserLevel {
  id: string;
  user_id: string;
  current_league_id: string;
  games_at_current_level: number;
  wins_at_current_level: number;
  days_in_league: number;
  joined_league_at: string;
  last_promotion_at: string | null;
  last_demotion_at: string | null;
  qualification_percent: number;
  is_qualified_for_promotion: boolean;
  promotion_history: { from: string; to: string; date: string }[];
  created_at: string;
  updated_at: string;
}

export interface DBUserWallet {
  id: string;
  user_id: string;
  token_balance: number;
  lifetime_tokens_earned: number;
  lifetime_tokens_spent: number;
  last_salary_paid_at: string | null;
  next_salary_due_at: string | null;
  subscription_status: 'free' | 'active' | 'cancelled' | 'past_due';
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBTokenTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Get all leagues
export async function getLeagues(): Promise<DBLeague[]> {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }

    return (data || []).map(league => ({
      ...league,
      perks: typeof league.perks === 'string' ? JSON.parse(league.perks) : league.perks || [],
    }));
  } catch (err) {
    console.error('Error fetching leagues:', err);
    return [];
  }
}

// Initialize a new member at Rookie Ball level (for admin approval flow)
export async function initializeNewMember(
  userId: string,
  startingLeagueId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the Rookie Ball league (highest level number = lowest rank)
    const leagues = await getLeagues();
    const rookieLeague = startingLeagueId 
      ? leagues.find(l => l.id === startingLeagueId)
      : leagues.reduce((max, l) => l.level > max.level ? l : max, leagues[0]);
    
    if (!rookieLeague) {
      return { success: false, error: 'No starting league found' };
    }

    // Check if user already has a level record
    const { data: existing } = await supabase
      .from('user_levels')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return { success: true }; // Already initialized
    }

    // Create user_levels record
    const { error: levelError } = await supabase
      .from('user_levels')
      .insert({
        user_id: userId,
        current_league_id: rookieLeague.id,
        games_at_current_level: 0,
        wins_at_current_level: 0,
        days_in_league: 0,
        joined_league_at: new Date().toISOString(),
        qualification_percent: 0,
        is_qualified_for_promotion: false,
        promotion_history: [],
      });

    if (levelError) {
      console.error('Error creating user level:', levelError);
      return { success: false, error: levelError.message };
    }

    // Initialize user wallet with starting bonus
    const { error: walletError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        token_balance: 50, // Welcome bonus
        lifetime_tokens_earned: 50,
        lifetime_tokens_spent: 0,
        subscription_status: 'free',
      });

    if (walletError) {
      console.error('Error creating user wallet:', walletError);
      // Don't fail the whole operation for wallet error
    }

    return { success: true };
  } catch (err) {
    console.error('Error initializing new member:', err);
    return { success: false, error: 'Failed to initialize new member' };
  }
}

// Get a specific league
export async function getLeague(leagueId: string): Promise<DBLeague | null> {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (error) {
      console.error('Error fetching league:', error);
      return null;
    }

    return {
      ...data,
      perks: typeof data.perks === 'string' ? JSON.parse(data.perks) : data.perks || [],
    };
  } catch (err) {
    console.error('Error fetching league:', err);
    return null;
  }
}

// Get user's current level
export async function getUserLevel(userId: string): Promise<DBUserLevel | null> {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record exists - create one at Rookie level
        return await initializeUserLevel(userId);
      }
      console.error('Error fetching user level:', error);
      return null;
    }

    return {
      ...data,
      promotion_history: typeof data.promotion_history === 'string' 
        ? JSON.parse(data.promotion_history) 
        : data.promotion_history || [],
    };
  } catch (err) {
    console.error('Error fetching user level:', err);
    return null;
  }
}

// Initialize a new user at Rookie level
export async function initializeUserLevel(userId: string): Promise<DBUserLevel | null> {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .insert({
        user_id: userId,
        current_league_id: 'rookie',
        games_at_current_level: 0,
        wins_at_current_level: 0,
        days_in_league: 0,
        qualification_percent: 0,
        is_qualified_for_promotion: false,
        promotion_history: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error initializing user level:', error);
      return null;
    }

    // Also initialize wallet
    await initializeUserWallet(userId);

    return data;
  } catch (err) {
    console.error('Error initializing user level:', err);
    return null;
  }
}

// Get user's wallet
export async function getUserWallet(userId: string): Promise<DBUserWallet | null> {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record exists - create one
        return await initializeUserWallet(userId);
      }
      console.error('Error fetching user wallet:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching user wallet:', err);
    return null;
  }
}

// Initialize user wallet
export async function initializeUserWallet(userId: string): Promise<DBUserWallet | null> {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        token_balance: 0,
        lifetime_tokens_earned: 0,
        lifetime_tokens_spent: 0,
        subscription_status: 'free',
      })
      .select()
      .single();

    if (error) {
      // Might already exist
      if (error.code === '23505') {
        return await getUserWallet(userId);
      }
      console.error('Error initializing user wallet:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error initializing user wallet:', err);
    return null;
  }
}

// Add tokens to user's wallet
export async function addTokens(
  userId: string,
  amount: number,
  transactionType: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // Get current wallet
    let wallet = await getUserWallet(userId);
    if (!wallet) {
      wallet = await initializeUserWallet(userId);
    }
    if (!wallet) {
      return { success: false, error: 'Could not get or create wallet' };
    }

    const newBalance = wallet.token_balance + amount;

    // Update wallet
    const { error: walletError } = await supabase
      .from('user_wallets')
      .update({
        token_balance: newBalance,
        lifetime_tokens_earned: wallet.lifetime_tokens_earned + (amount > 0 ? amount : 0),
        lifetime_tokens_spent: wallet.lifetime_tokens_spent + (amount < 0 ? Math.abs(amount) : 0),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (walletError) {
      console.error('Error updating wallet:', walletError);
      return { success: false, error: walletError.message };
    }

    // Record transaction
    await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount,
        balance_after: newBalance,
        transaction_type: transactionType,
        description,
        metadata,
      });

    return { success: true, newBalance };
  } catch (err: any) {
    console.error('Error adding tokens:', err);
    return { success: false, error: err.message || 'Failed to add tokens' };
  }
}

// Spend tokens (with validation)
export async function spendTokens(
  userId: string,
  amount: number,
  transactionType: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const wallet = await getUserWallet(userId);
  if (!wallet) {
    return { success: false, error: 'Wallet not found' };
  }

  if (wallet.token_balance < amount) {
    return { success: false, error: 'Insufficient tokens' };
  }

  return addTokens(userId, -amount, transactionType, description, metadata);
}

// Get token transaction history
export async function getTokenTransactions(
  userId: string,
  limit: number = 20
): Promise<DBTokenTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching token transactions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching token transactions:', err);
    return [];
  }
}

// Pay monthly salary to a user based on their league tier
export async function payMonthlySalary(
  userId: string
): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    // Get user's level and league
    const userLevel = await getUserLevel(userId);
    if (!userLevel) {
      return { success: false, error: 'User level not found' };
    }

    const league = await getLeague(userLevel.current_league_id);
    if (!league) {
      return { success: false, error: 'League not found' };
    }

    const salary = league.monthly_salary || 0;
    if (salary === 0) {
      return { success: true, amount: 0 }; // No salary for this tier
    }

    // Add salary tokens
    const result = await addTokens(
      userId,
      salary,
      'salary',
      `Monthly salary for ${league.name}`,
      { league_id: league.id, league_level: league.level }
    );

    if (result.success) {
      // Update wallet with next salary due date (30 days from now)
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30);
      
      await supabase
        .from('user_wallets')
        .update({
          last_salary_paid_at: new Date().toISOString(),
          next_salary_due_at: nextDue.toISOString(),
        })
        .eq('user_id', userId);
    }

    return { success: result.success, amount: salary, error: result.error };
  } catch (err: any) {
    console.error('Error paying salary:', err);
    return { success: false, error: err.message || 'Failed to pay salary' };
  }
}

// Pay salaries to all active users (admin function)
export async function payAllSalaries(): Promise<{
  success: boolean;
  paid: number;
  failed: number;
  total: number;
}> {
  try {
    // Get all users with wallets
    const { data: wallets } = await supabase
      .from('user_wallets')
      .select('user_id, next_salary_due_at');

    if (!wallets) {
      return { success: false, paid: 0, failed: 0, total: 0 };
    }

    const now = new Date();
    let paid = 0;
    let failed = 0;

    for (const wallet of wallets) {
      // Check if salary is due
      const isDue = !wallet.next_salary_due_at || new Date(wallet.next_salary_due_at) <= now;
      
      if (isDue) {
        const result = await payMonthlySalary(wallet.user_id);
        if (result.success) {
          paid++;
        } else {
          failed++;
        }
      }
    }

    return { success: true, paid, failed, total: wallets.length };
  } catch (err) {
    console.error('Error paying all salaries:', err);
    return { success: false, paid: 0, failed: 0, total: 0 };
  }
}

// "Quit Job" - Cancel subscription, forfeit tokens, release team
export async function quitJob(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get wallet
    const wallet = await getUserWallet(userId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Record the forfeiture
    if (wallet.token_balance > 0) {
      await addTokens(
        userId,
        -wallet.token_balance,
        'forfeit',
        'Forfeited tokens upon leaving league',
        { final_balance: wallet.token_balance }
      );
    }

    // Reset wallet
    await supabase
      .from('user_wallets')
      .update({
        token_balance: 0,
        subscription_status: 'cancelled',
        subscription_ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Reset user level to rookie
    await supabase
      .from('user_levels')
      .update({
        current_league_id: 'rookie',
        games_at_current_level: 0,
        wins_at_current_level: 0,
        qualification_percent: 0,
        is_qualified_for_promotion: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { success: true };
  } catch (err: any) {
    console.error('Error quitting job:', err);
    return { success: false, error: err.message || 'Failed to quit' };
  }
}

// Calculate promotion qualification percentage
export async function calculateQualification(userId: string): Promise<{
  percent: number;
  isQualified: boolean;
  requirements: {
    games: { current: number; required: number; met: boolean };
    winRate: { current: number; required: number; met: boolean };
    days: { current: number; required: number; met: boolean };
  };
  nextLeague: DBLeague | null;
}> {
  try {
    const userLevel = await getUserLevel(userId);
    if (!userLevel) {
      return {
        percent: 0,
        isQualified: false,
        requirements: {
          games: { current: 0, required: 0, met: false },
          winRate: { current: 0, required: 0, met: false },
          days: { current: 0, required: 0, met: false },
        },
        nextLeague: null,
      };
    }

    const currentLeague = await getLeague(userLevel.current_league_id);
    if (!currentLeague || currentLeague.level === 1) {
      // Already at Majors - no promotion available
      return {
        percent: 100,
        isQualified: false,
        requirements: {
          games: { current: userLevel.games_at_current_level, required: 0, met: true },
          winRate: { current: 0, required: 0, met: true },
          days: { current: userLevel.days_in_league, required: 0, met: true },
        },
        nextLeague: null,
      };
    }

    // Get next league level
    const leagues = await getLeagues();
    const nextLeague = leagues.find(l => l.level === currentLeague.level - 1);
    if (!nextLeague) {
      return {
        percent: 100,
        isQualified: false,
        requirements: {
          games: { current: userLevel.games_at_current_level, required: 0, met: true },
          winRate: { current: 0, required: 0, met: true },
          days: { current: userLevel.days_in_league, required: 0, met: true },
        },
        nextLeague: null,
      };
    }

    // Calculate days in league
    const joinedAt = new Date(userLevel.joined_league_at);
    const now = new Date();
    const daysInLeague = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate win rate
    const winRate = userLevel.games_at_current_level > 0
      ? userLevel.wins_at_current_level / userLevel.games_at_current_level
      : 0;

    // Check each requirement
    const gamesMet = userLevel.games_at_current_level >= nextLeague.min_games_to_qualify;
    const winRateMet = winRate >= nextLeague.min_win_rate;
    const daysMet = daysInLeague >= nextLeague.min_time_in_league_days;

    // Calculate percentage (weighted average)
    const gamesPercent = Math.min(100, (userLevel.games_at_current_level / nextLeague.min_games_to_qualify) * 100);
    const winRatePercent = nextLeague.min_win_rate > 0 
      ? Math.min(100, (winRate / nextLeague.min_win_rate) * 100)
      : 100;
    const daysPercent = nextLeague.min_time_in_league_days > 0
      ? Math.min(100, (daysInLeague / nextLeague.min_time_in_league_days) * 100)
      : 100;

    const overallPercent = Math.round((gamesPercent + winRatePercent + daysPercent) / 3);
    const isQualified = gamesMet && winRateMet && daysMet;

    // Update user's qualification status
    await supabase
      .from('user_levels')
      .update({
        qualification_percent: overallPercent,
        is_qualified_for_promotion: isQualified,
        days_in_league: daysInLeague,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return {
      percent: overallPercent,
      isQualified,
      requirements: {
        games: { 
          current: userLevel.games_at_current_level, 
          required: nextLeague.min_games_to_qualify, 
          met: gamesMet 
        },
        winRate: { 
          current: Math.round(winRate * 100), 
          required: Math.round(nextLeague.min_win_rate * 100), 
          met: winRateMet 
        },
        days: { 
          current: daysInLeague, 
          required: nextLeague.min_time_in_league_days, 
          met: daysMet 
        },
      },
      nextLeague,
    };
  } catch (err) {
    console.error('Error calculating qualification:', err);
    return {
      percent: 0,
      isQualified: false,
      requirements: {
        games: { current: 0, required: 0, met: false },
        winRate: { current: 0, required: 0, met: false },
        days: { current: 0, required: 0, met: false },
      },
      nextLeague: null,
    };
  }
}

// Promote user to next league (commissioner action)
export async function promoteUser(
  userId: string,
  toLeagueId: string,
  skipRequirements: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const userLevel = await getUserLevel(userId);
    if (!userLevel) {
      return { success: false, error: 'User level not found' };
    }

    if (!skipRequirements) {
      const qualification = await calculateQualification(userId);
      if (!qualification.isQualified) {
        return { success: false, error: 'User is not qualified for promotion' };
      }
    }

    const newLeague = await getLeague(toLeagueId);
    if (!newLeague) {
      return { success: false, error: 'Target league not found' };
    }

    // Update user level
    const promotionEntry = {
      from: userLevel.current_league_id,
      to: toLeagueId,
      date: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_levels')
      .update({
        current_league_id: toLeagueId,
        games_at_current_level: 0,
        wins_at_current_level: 0,
        qualification_percent: 0,
        is_qualified_for_promotion: false,
        last_promotion_at: new Date().toISOString(),
        promotion_history: [...userLevel.promotion_history, promotionEntry],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error promoting user:', error);
      return { success: false, error: error.message };
    }

    // Award promotion bonus tokens
    await addTokens(
      userId,
      100,
      'promotion_bonus',
      `Promoted to ${newLeague.name}!`
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error promoting user:', err);
    return { success: false, error: err.message || 'Failed to promote user' };
  }
}

// Get user's full league profile
export async function getUserLeagueProfile(userId: string): Promise<{
  level: DBUserLevel | null;
  league: DBLeague | null;
  wallet: DBUserWallet | null;
  qualification: Awaited<ReturnType<typeof calculateQualification>>;
}> {
  const level = await getUserLevel(userId);
  const league = level ? await getLeague(level.current_league_id) : null;
  const wallet = await getUserWallet(userId);
  const qualification = await calculateQualification(userId);

  return { level, league, wallet, qualification };
}

// Update user stats when a game is logged (integrates with game logger)
export async function updateUserLevelFromGame(
  userId: string,
  isWin: boolean
): Promise<void> {
  try {
    const userLevel = await getUserLevel(userId);
    if (!userLevel) {
      await initializeUserLevel(userId);
      return;
    }

    await supabase
      .from('user_levels')
      .update({
        games_at_current_level: userLevel.games_at_current_level + 1,
        wins_at_current_level: userLevel.wins_at_current_level + (isWin ? 1 : 0),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Recalculate qualification
    await calculateQualification(userId);
  } catch (err) {
    console.error('Error updating user level from game:', err);
  }
}

// Get all users at a specific league level (for admin)
export async function getUsersAtLeague(leagueId: string): Promise<(DBUserLevel & { display_name?: string; team_id?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('current_league_id', leagueId);

    if (error) {
      console.error('Error fetching users at league:', error);
      return [];
    }

    // Get display names and team info
    const userIds = (data || []).map(u => u.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, team_id')
      .in('id', userIds);

    const userMap = new Map((users || []).map(u => [u.id, { display_name: u.display_name, team_id: u.team_id }]));

    return (data || []).map(level => ({
      ...level,
      display_name: userMap.get(level.user_id)?.display_name || 'Unknown',
      team_id: userMap.get(level.user_id)?.team_id,
    }));
  } catch (err) {
    console.error('Error fetching users at league:', err);
    return [];
  }
}

// ============================================================================
// PERK & TOOL ACCESS FUNCTIONS
// ============================================================================

// Available perks that can be granted at different league levels
export const AVAILABLE_PERKS = {
  smart_recap: { name: 'Smart Recap', description: 'AI-powered game recap generation', tokenCost: 25 },
  scouting_reports: { name: 'Scouting Reports', description: 'AI analysis of hitting/pitching', tokenCost: 50 },
  roster_advice: { name: 'Roster Advice', description: 'AI-powered roster recommendations', tokenCost: 75 },
  priority_support: { name: 'Priority Support', description: 'Fast response from commissioners', tokenCost: 100 },
  custom_graphics: { name: 'Custom Graphics', description: 'Custom team graphics and banners', tokenCost: 150 },
  league_intel: { name: 'League Intel', description: 'Access to league-wide analytics', tokenCost: 200 },
} as const;

export type PerkId = keyof typeof AVAILABLE_PERKS;

// Check if a user has access to a specific perk based on their league level
export async function userHasPerk(userId: string, perkId: PerkId): Promise<boolean> {
  try {
    const profile = await getUserLeagueProfile(userId);
    if (!profile.league) return false;
    
    return profile.league.perks.includes(perkId);
  } catch (err) {
    console.error('Error checking user perk:', err);
    return false;
  }
}

// Get all perks a user has access to
export async function getUserPerks(userId: string): Promise<string[]> {
  try {
    const profile = await getUserLeagueProfile(userId);
    return profile.league?.perks || [];
  } catch (err) {
    console.error('Error getting user perks:', err);
    return [];
  }
}

// Check if user can purchase a perk with tokens (for users without the perk in their tier)
export async function canPurchasePerk(userId: string, perkId: PerkId): Promise<{ canPurchase: boolean; reason?: string }> {
  try {
    // First check if they already have it from their tier
    const hasPerk = await userHasPerk(userId, perkId);
    if (hasPerk) {
      return { canPurchase: false, reason: 'You already have this perk from your league level' };
    }

    // Check token balance
    const wallet = await getUserWallet(userId);
    const cost = AVAILABLE_PERKS[perkId]?.tokenCost || 0;
    
    if (!wallet || wallet.token_balance < cost) {
      return { canPurchase: false, reason: `Need ${cost} tokens (you have ${wallet?.token_balance || 0})` };
    }

    return { canPurchase: true };
  } catch (err) {
    console.error('Error checking perk purchase:', err);
    return { canPurchase: false, reason: 'Error checking eligibility' };
  }
}

// ============================================================================
// DEMOTION FUNCTION (Admin)
// ============================================================================

// Demote a user to a lower league level
export async function demoteUser(
  userId: string, 
  targetLeagueId: string,
  demotedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentLevel = await getUserLevel(userId);
    const targetLeague = await getLeague(targetLeagueId);
    
    if (!currentLevel || !targetLeague) {
      return { success: false, error: 'User or target league not found' };
    }

    const currentLeague = await getLeague(currentLevel.current_league_id);
    if (!currentLeague) {
      return { success: false, error: 'Current league not found' };
    }

    // Ensure demotion is to a lower level (higher number = lower tier)
    if (targetLeague.level <= currentLeague.level) {
      return { success: false, error: 'Target league must be a lower level' };
    }

    // Update user level
    const { error } = await supabase
      .from('user_levels')
      .update({
        current_league_id: targetLeagueId,
        games_at_current_level: 0,
        wins_at_current_level: 0,
        days_in_league: 0,
        joined_league_at: new Date().toISOString(),
        last_demotion_at: new Date().toISOString(),
        qualification_percent: 0,
        is_qualified_for_promotion: false,
        promotion_history: [
          ...currentLevel.promotion_history,
          { 
            from: currentLevel.current_league_id, 
            to: targetLeagueId, 
            date: new Date().toISOString(),
            demoted_by: demotedBy,
            reason: reason || 'Demotion',
            type: 'demotion',
          }
        ],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error demoting user:', err);
    return { success: false, error: err.message || 'Failed to demote user' };
  }
}

// Get all users qualified for promotion
export async function getQualifiedForPromotion(): Promise<(DBUserLevel & { display_name?: string; team_id?: string; current_league_name?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('is_qualified_for_promotion', true);

    if (error) {
      console.error('Error fetching qualified users:', error);
      return [];
    }

    // Get display names and team info
    const userIds = (data || []).map(u => u.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, team_id')
      .in('id', userIds);

    // Get league names
    const leagueIds = Array.from(new Set((data || []).map(u => u.current_league_id)));
    const leagues = await Promise.all(leagueIds.map(id => getLeague(id)));
    const leagueMap = new Map(leagues.filter(l => l).map(l => [l!.id, l!.name]));

    const userMap = new Map((users || []).map(u => [u.id, { display_name: u.display_name, team_id: u.team_id }]));

    return (data || []).map(level => ({
      ...level,
      display_name: userMap.get(level.user_id)?.display_name || 'Unknown',
      team_id: userMap.get(level.user_id)?.team_id,
      current_league_name: leagueMap.get(level.current_league_id) || level.current_league_id,
    }));
  } catch (err) {
    console.error('Error fetching qualified users:', err);
    return [];
  }
}

// Get league summary stats for admin dashboard
export async function getLeagueSummary(): Promise<{ leagueId: string; name: string; level: number; playerCount: number; color: string }[]> {
  try {
    const leagues = await getLeagues();
    
    const summary = await Promise.all(
      leagues.map(async (league) => {
        const { count } = await supabase
          .from('user_levels')
          .select('*', { count: 'exact', head: true })
          .eq('current_league_id', league.id);

        return {
          leagueId: league.id,
          name: league.name,
          level: league.level,
          playerCount: count || 0,
          color: league.color,
        };
      })
    );

    return summary.sort((a, b) => a.level - b.level);
  } catch (err) {
    console.error('Error getting league summary:', err);
    return [];
  }
}

// ============================================================================
// LEAGUE DIRECTOR MANAGEMENT
// ============================================================================

// Director titles based on league
const DIRECTOR_TITLES: Record<string, string> = {
  'triple-a': 'Triple-A Director',
  'double-a': 'Double-A Director',
  'single-a': 'Single-A Director',
  'rookie': 'Rookie Ball Director',
};

// Set a user as a league director
export async function setLeagueDirector(
  userId: string,
  leagueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const title = DIRECTOR_TITLES[leagueId] || `${leagueId} Director`;

    // Update the user
    const { error: userError } = await supabase
      .from('users')
      .update({
        is_league_director: true,
        managed_league_id: leagueId,
        director_title: title,
      })
      .eq('id', userId);

    if (userError) throw userError;

    // Update the league to reference this director
    const { error: leagueError } = await supabase
      .from('leagues')
      .update({
        director_user_id: userId,
        manager_name: title.replace(' Director', ''), // e.g. "Triple-A"
      })
      .eq('id', leagueId);

    if (leagueError) throw leagueError;

    return { success: true };
  } catch (err: any) {
    console.error('Error setting league director:', err);
    return { success: false, error: err.message || 'Failed to set league director' };
  }
}

// Remove a user as league director
export async function removeLeagueDirector(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current managed league
    const { data: user } = await supabase
      .from('users')
      .select('managed_league_id')
      .eq('id', userId)
      .single();

    // Remove director from league
    if (user?.managed_league_id) {
      await supabase
        .from('leagues')
        .update({
          director_user_id: null,
          manager_name: null,
        })
        .eq('id', user.managed_league_id);
    }

    // Remove director role from user
    const { error } = await supabase
      .from('users')
      .update({
        is_league_director: false,
        managed_league_id: null,
        director_title: null,
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error removing league director:', err);
    return { success: false, error: err.message || 'Failed to remove league director' };
  }
}

// Get all league directors
export async function getLeagueDirectors(): Promise<{
  userId: string;
  displayName: string;
  leagueId: string;
  leagueName: string;
  directorTitle: string;
}[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, managed_league_id, director_title')
      .eq('is_league_director', true);

    if (error) throw error;

    // Get league names
    const leagues = await getLeagues();
    const leagueMap = new Map(leagues.map(l => [l.id, l.name]));

    return (data || []).map(u => ({
      userId: u.id,
      displayName: u.display_name,
      leagueId: u.managed_league_id,
      leagueName: leagueMap.get(u.managed_league_id) || u.managed_league_id,
      directorTitle: u.director_title || 'Director',
    }));
  } catch (err) {
    console.error('Error getting league directors:', err);
    return [];
  }
}

// =============================================================================
// SUPPORT TICKETS SYSTEM
// =============================================================================

export interface DBSupportTicket {
  id: string;
  user_id: string | null;
  username: string;
  email: string | null;
  ticket_type: 'bug' | 'feature' | 'question' | 'account' | 'other';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  attachments: string[]; // Array of file URLs
  admin_notes: string | null;
  assigned_to: string | null;
  resolved_by: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface DBTicketComment {
  id: string;
  ticket_id: string;
  user_id: string | null;
  username: string;
  is_admin: boolean;
  comment: string;
  attachments: string[];
  created_at: string;
}

// Create a new support ticket
export async function createSupportTicket(ticket: {
  user_id?: string;
  username: string;
  email?: string;
  ticket_type: 'bug' | 'feature' | 'question' | 'account' | 'other';
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
}): Promise<{ success: boolean; ticket?: DBSupportTicket; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: ticket.user_id || null,
        username: ticket.username,
        email: ticket.email || null,
        ticket_type: ticket.ticket_type,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority || 'medium',
        attachments: ticket.attachments || [],
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, ticket: data };
  } catch (err: any) {
    console.error('Error creating support ticket:', err);
    return { success: false, error: err.message || 'Failed to create ticket' };
  }
}

// Get tickets for a user
export async function getUserTickets(userId: string): Promise<DBSupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching user tickets:', err);
    return [];
  }
}

// Get all tickets (admin only)
export async function getAllTickets(filters?: {
  status?: string;
  type?: string;
  priority?: string;
}): Promise<DBSupportTicket[]> {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('ticket_type', filters.type);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching all tickets:', err);
    return [];
  }
}

// Get a single ticket by ID
export async function getTicketById(ticketId: string): Promise<DBSupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching ticket:', err);
    return null;
  }
}

// Update ticket status (admin)
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed',
  adminId?: string,
  resolution?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = { status };
    
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
      if (adminId) updates.resolved_by = adminId;
      if (resolution) updates.resolution = resolution;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating ticket status:', err);
    return { success: false, error: err.message || 'Failed to update ticket' };
  }
}

// Add admin notes to ticket
export async function addTicketNotes(
  ticketId: string,
  notes: string,
  assignTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = { admin_notes: notes };
    if (assignTo) updates.assigned_to = assignTo;

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error adding ticket notes:', err);
    return { success: false, error: err.message || 'Failed to add notes' };
  }
}

// Add comment to ticket
export async function addTicketComment(comment: {
  ticket_id: string;
  user_id?: string;
  username: string;
  is_admin: boolean;
  comment: string;
  attachments?: string[];
}): Promise<{ success: boolean; comment?: DBTicketComment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: comment.ticket_id,
        user_id: comment.user_id || null,
        username: comment.username,
        is_admin: comment.is_admin,
        comment: comment.comment,
        attachments: comment.attachments || [],
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, comment: data };
  } catch (err: any) {
    console.error('Error adding ticket comment:', err);
    return { success: false, error: err.message || 'Failed to add comment' };
  }
}

// Get comments for a ticket
export async function getTicketComments(ticketId: string): Promise<DBTicketComment[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching ticket comments:', err);
    return [];
  }
}

// Get ticket statistics for admin dashboard
export async function getTicketStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('status, ticket_type, priority');

    if (error) throw error;

    const tickets = data || [];
    const stats = {
      total: tickets.length,
      open: 0,
      inProgress: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    tickets.forEach(t => {
      // Count by status
      if (t.status === 'open') stats.open++;
      else if (t.status === 'in_progress') stats.inProgress++;
      else if (t.status === 'waiting') stats.waiting++;
      else if (t.status === 'resolved') stats.resolved++;
      else if (t.status === 'closed') stats.closed++;

      // Count by type
      stats.byType[t.ticket_type] = (stats.byType[t.ticket_type] || 0) + 1;

      // Count by priority
      stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
    });

    return stats;
  } catch (err) {
    console.error('Error fetching ticket stats:', err);
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      byType: {},
      byPriority: {},
    };
  }
}

// Upload attachment to Supabase storage
export async function uploadTicketAttachment(
  file: File,
  ticketId?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${ticketId || 'new'}_${Date.now()}.${fileExt}`;
    const filePath = `ticket-attachments/${fileName}`;

    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    console.error('Error uploading attachment:', err);
    return { success: false, error: err.message || 'Failed to upload file' };
  }
}

// =============================================================================
// OFF-SEASON MANAGEMENT SYSTEM
// =============================================================================

import type {
  SeasonPhase,
  SeasonState,
  FreeAgentDeclaration,
  FreeAgentClaim,
  QuestionnaireStatus,
  FinalStanding,
  PlayerClassification,
} from '@/types/offseason';

// Types for off-season
export interface DBSeasonState {
  id: string;
  season_number: number;
  game_version?: string;  // e.g., "MLB The Show 25"
  phase: SeasonPhase;
  phase_started_at: string;
  phase_deadline?: string;
  world_series_start?: string;
  world_series_end?: string;
  claiming_deadline?: string;
  notes?: string;
  is_current?: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DBFreeAgentDeclaration {
  id: string;
  season_number: number;
  declaring_team_id: string;
  declaring_user_id: string;
  declaring_team_name?: string;
  declaring_user_name?: string;
  player_name: string;
  position: string;
  classification: PlayerClassification;
  overall_rating: number;
  // MLB The Show integration
  player_uuid?: string;
  card_img?: string;
  team_short_name?: string;
  // Locking
  is_locked: boolean;
  locked_at?: string;
  // Status
  declared_at: string;
  is_claimed: boolean;
  claimed_by_team_id?: string;
  claimed_at?: string;
}

export interface DBFreeAgentClaim {
  id: string;
  season_number: number;
  claiming_team_id: string;
  claiming_user_id: string;
  claiming_team_record?: string;
  claiming_team_wins?: number;
  target_free_agent_id: string;
  target_player_name: string;
  target_classification: PlayerClassification;
  offered_player_name: string;
  offered_position: string;
  offered_classification: PlayerClassification;
  offered_overall_rating: number;
  status: 'pending' | 'approved' | 'denied' | 'processed';
  submitted_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface DBQuestionnaireStatus {
  id: string;
  user_id: string;
  season_number: number;
  completed: boolean;
  completed_at?: string;
  continuing_participation: boolean;
  team_retention_preference: 'keep' | 'switch' | 'open';
  requested_team?: string;
  feedback?: string;
}

// Get current season state
export async function getCurrentSeasonState(): Promise<DBSeasonState | null> {
  try {
    const { data, error } = await supabase
      .from('season_state')
      .select('*')
      .order('season_number', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching season state:', err);
    return null;
  }
}

// Update season phase (commissioner only)
export async function updateSeasonPhase(
  seasonId: string,
  phase: SeasonPhase,
  deadline?: string | null,
  notes?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      phase,
      phase_started_at: new Date().toISOString(),
      phase_deadline: deadline ?? null,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined && notes !== null) {
      payload.notes = notes;
    }
    const { error } = await supabase.from('season_state').update(payload).eq('id', seasonId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating season phase:', err);
    return { success: false, error: err.message };
  }
}

// Create new season
export async function createNewSeason(
  seasonNumber: number,
  gameVersion?: string
): Promise<{ success: boolean; season?: DBSeasonState; error?: string }> {
  try {
    // Mark all previous seasons as not current
    await supabase
      .from('season_state')
      .update({ is_current: false })
      .eq('is_current', true);

    const { data, error } = await supabase
      .from('season_state')
      .insert({
        season_number: seasonNumber,
        game_version: gameVersion || 'MLB The Show 25',
        phase: 'pre_season',
        phase_started_at: new Date().toISOString(),
        is_current: true,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, season: data };
  } catch (err: any) {
    console.error('Error creating new season:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// GAME VERSION MANAGEMENT
// =============================================================================

export interface DBGameVersion {
  id: string;
  version_name: string;
  short_name: string;
  release_year: number;
  is_current: boolean;
  started_at?: string;
  ended_at?: string;
  total_seasons: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DBSeasonArchive {
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

// Get all game versions
export async function getGameVersions(): Promise<DBGameVersion[]> {
  try {
    const { data, error } = await supabase
      .from('game_versions')
      .select('*')
      .order('release_year', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching game versions:', err);
    return [];
  }
}

// Get current game version
export async function getCurrentGameVersion(): Promise<DBGameVersion | null> {
  try {
    const { data, error } = await supabase
      .from('game_versions')
      .select('*')
      .eq('is_current', true)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching current game version:', err);
    return null;
  }
}

// Create new game version (for when new MLB The Show releases)
export async function createGameVersion(
  versionName: string,
  shortName: string,
  releaseYear: number
): Promise<{ success: boolean; gameVersion?: DBGameVersion; error?: string }> {
  try {
    // Mark current game version as ended
    await supabase
      .from('game_versions')
      .update({
        is_current: false,
        ended_at: new Date().toISOString(),
      })
      .eq('is_current', true);

    const { data, error } = await supabase
      .from('game_versions')
      .insert({
        version_name: versionName,
        short_name: shortName,
        release_year: releaseYear,
        is_current: true,
        started_at: new Date().toISOString(),
        total_seasons: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, gameVersion: data };
  } catch (err: any) {
    console.error('Error creating game version:', err);
    return { success: false, error: err.message };
  }
}

// Advance to next season within current game
export async function advanceToNextSeason(
  archiveData?: Partial<DBSeasonArchive>
): Promise<{ success: boolean; newSeason?: DBSeasonState; error?: string }> {
  try {
    // Get current season
    const currentSeason = await getCurrentSeasonState();
    if (!currentSeason) {
      return { success: false, error: 'No current season found' };
    }

    // Archive current season if archive data provided
    if (archiveData) {
      await supabase.from('season_archives').insert({
        game_version: currentSeason.game_version || 'MLB The Show 25',
        season_number: currentSeason.season_number,
        ...archiveData,
        archived_at: new Date().toISOString(),
      });
    }

    // Mark current season as archived
    await supabase
      .from('season_state')
      .update({
        is_current: false,
        archived_at: new Date().toISOString(),
      })
      .eq('id', currentSeason.id);

    // Update game version's season count
    await supabase
      .from('game_versions')
      .update({
        total_seasons: currentSeason.season_number,
        updated_at: new Date().toISOString(),
      })
      .eq('version_name', currentSeason.game_version || 'MLB The Show 25');

    // Create new season
    const newSeasonNumber = currentSeason.season_number + 1;
    const result = await createNewSeason(newSeasonNumber, currentSeason.game_version);

    return result;
  } catch (err: any) {
    console.error('Error advancing season:', err);
    return { success: false, error: err.message };
  }
}

// Advance to new game version (e.g., MLB The Show 25 -> MLB The Show 26)
export async function advanceToNewGame(
  newVersionName: string,
  archiveData?: Partial<DBSeasonArchive>
): Promise<{ success: boolean; newSeason?: DBSeasonState; newGameVersion?: DBGameVersion; error?: string }> {
  try {
    // Get current season
    const currentSeason = await getCurrentSeasonState();
    
    // Archive current season if exists
    if (currentSeason && archiveData) {
      await supabase.from('season_archives').insert({
        game_version: currentSeason.game_version || 'MLB The Show 25',
        season_number: currentSeason.season_number,
        ...archiveData,
        archived_at: new Date().toISOString(),
      });

      // Mark current season as archived
      await supabase
        .from('season_state')
        .update({
          is_current: false,
          archived_at: new Date().toISOString(),
        })
        .eq('id', currentSeason.id);
    }

    // Parse year from version name (e.g., "MLB The Show 26" -> 2026)
    const yearMatch = newVersionName.match(/\d{2}$/);
    const releaseYear = yearMatch ? 2000 + parseInt(yearMatch[0]) : new Date().getFullYear();
    const shortName = `MTS${yearMatch?.[0] || releaseYear.toString().slice(-2)}`;

    // Create new game version
    const versionResult = await createGameVersion(newVersionName, shortName, releaseYear);
    if (!versionResult.success) {
      return { success: false, error: versionResult.error };
    }

    // Create Season 1 of new game
    const seasonResult = await createNewSeason(1, newVersionName);

    return {
      success: seasonResult.success,
      newSeason: seasonResult.season,
      newGameVersion: versionResult.gameVersion,
      error: seasonResult.error,
    };
  } catch (err: any) {
    console.error('Error advancing to new game:', err);
    return { success: false, error: err.message };
  }
}

// Get season archives
export async function getSeasonArchives(gameVersion?: string): Promise<DBSeasonArchive[]> {
  try {
    let query = supabase
      .from('season_archives')
      .select('*')
      .order('game_version', { ascending: false })
      .order('season_number', { ascending: false });

    if (gameVersion) {
      query = query.eq('game_version', gameVersion);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching season archives:', err);
    return [];
  }
}

// =============================================================================
// DRAFT ORDER CALCULATION - JKAP MEMORIAL LEAGUE DRAFT LOTTERY
// =============================================================================
// Rules:
// 1. Top 5 picks are LOCKED (worst 5 teams get picks 1-5 in order)
// 2. Picks 6+ use WEIGHTED LOTTERY (worse record = higher odds)
// 3. Contracted teams are excluded from the draft entirely

export interface DraftOrderTeam {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  draftPosition: number;
  wins: number;
  losses: number;
  winPercentage: number;
  standingsRank: number;  // Original position in standings (1 = worst)
  isLocked: boolean;      // True for picks 1-5
  lotteryOdds?: number;   // Percentage chance for lottery picks
  lotteryNumber?: number; // Random number drawn in lottery
}

export interface DraftOrderResult {
  success: boolean;
  draftOrder?: DraftOrderTeam[];
  lockedPicks?: DraftOrderTeam[];    // Picks 1-5
  lotteryPicks?: DraftOrderTeam[];   // Picks 6+
  lotteryLog?: string[];             // Log of lottery draws for transparency
  excludedTeams?: string[];          // Teams that were excluded
  error?: string;
}

// Default contracted teams (cumulative list)
export const DEFAULT_CONTRACTED_TEAMS = ['LAD', 'CHC', 'ATL']; // Dodgers, Cubs, Braves

// Get contracted teams from database
export async function getContractedTeams(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('league_settings')
      .select('contracted_teams')
      .single();

    if (error || !data?.contracted_teams) {
      return DEFAULT_CONTRACTED_TEAMS;
    }
    return data.contracted_teams;
  } catch (err) {
    console.error('Error fetching contracted teams:', err);
    return DEFAULT_CONTRACTED_TEAMS;
  }
}

// Save contracted teams to database
export async function saveContractedTeams(teamAbbreviations: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from('league_settings')
      .select('id')
      .single();

    if (existing) {
      const { error } = await supabase
        .from('league_settings')
        .update({
          contracted_teams: teamAbbreviations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('league_settings')
        .insert({
          contracted_teams: teamAbbreviations,
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving contracted teams:', err);
    return { success: false, error: err.message };
  }
}

/**
 * JKAP Memorial League Draft Lottery
 * 
 * Rules:
 * - Top 5 picks are LOCKED to the 5 worst teams (by record)
 * - Picks 6+ are determined by WEIGHTED LOTTERY
 * - Worse record = higher lottery odds
 * - Contracted teams are excluded entirely
 */
export async function calculateDraftOrder(
  seasonNumber: number,
  excludedTeamIds: string[] = []
): Promise<DraftOrderResult> {
  try {
    // Get final standings (sorted worst to best by win percentage)
    const { data: standings, error } = await supabase
      .from('final_standings')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('win_percentage', { ascending: true }); // Worst first

    if (error) throw error;
    if (!standings || standings.length === 0) {
      return { success: false, error: 'No standings found for this season' };
    }

    // Filter out excluded/contracted teams
    const activeStandings = standings.filter(
      (s) => !excludedTeamIds.includes(s.team_id) && 
             !excludedTeamIds.includes(s.team_abbreviation)
    );

    if (activeStandings.length === 0) {
      return { success: false, error: 'No active teams after excluding contracted teams' };
    }

    const excludedTeamNames = standings
      .filter(s => excludedTeamIds.includes(s.team_id) || excludedTeamIds.includes(s.team_abbreviation))
      .map(s => s.team_name);

    const draftOrder: DraftOrderTeam[] = [];
    const lockedPicks: DraftOrderTeam[] = [];
    const lotteryPicks: DraftOrderTeam[] = [];
    const lotteryLog: string[] = [];

    // =========================================================================
    // STEP 1: LOCK TOP 5 PICKS (worst 5 teams get picks 1-5)
    // =========================================================================
    const numLockedPicks = Math.min(5, activeStandings.length);
    
    for (let i = 0; i < numLockedPicks; i++) {
      const team = activeStandings[i];
      const pick: DraftOrderTeam = {
        teamId: team.team_id,
        teamName: team.team_name,
        teamAbbreviation: team.team_abbreviation,
        draftPosition: i + 1,
        wins: team.wins,
        losses: team.losses,
        winPercentage: team.win_percentage,
        standingsRank: i + 1,
        isLocked: true,
      };
      draftOrder.push(pick);
      lockedPicks.push(pick);
      lotteryLog.push(`Pick ${i + 1}: ${team.team_name} (${team.wins}-${team.losses}) - LOCKED`);
    }

    // =========================================================================
    // STEP 2: WEIGHTED LOTTERY FOR PICKS 6+
    // =========================================================================
    if (activeStandings.length > 5) {
      const lotteryTeams = activeStandings.slice(5); // Teams 6 and beyond
      
      // Calculate weighted odds based on standings position
      // Worse teams (lower in remaining standings) get higher odds
      const totalWeight = lotteryTeams.reduce((sum, _, idx) => sum + (lotteryTeams.length - idx), 0);
      
      // Create lottery pool with odds
      const lotteryPool = lotteryTeams.map((team, idx) => {
        const weight = lotteryTeams.length - idx; // Worse teams get more weight
        const odds = (weight / totalWeight) * 100;
        return {
          team,
          weight,
          odds,
          standingsRank: idx + 6, // 6th worst, 7th worst, etc.
        };
      });

      lotteryLog.push('');
      lotteryLog.push('=== LOTTERY ODDS ===');
      lotteryPool.forEach(entry => {
        lotteryLog.push(`${entry.team.team_name} (${entry.team.wins}-${entry.team.losses}): ${entry.odds.toFixed(1)}% chance`);
      });
      lotteryLog.push('');
      lotteryLog.push('=== LOTTERY DRAWS ===');

      // Run the weighted lottery
      const remainingTeams = [...lotteryPool];
      let draftPosition = 6;

      while (remainingTeams.length > 0) {
        // Calculate current total weight
        const currentTotalWeight = remainingTeams.reduce((sum, entry) => sum + entry.weight, 0);
        
        // Generate random number
        const randomNum = Math.random() * currentTotalWeight;
        
        // Find winner based on weighted selection
        let cumulative = 0;
        let winnerIdx = 0;
        for (let i = 0; i < remainingTeams.length; i++) {
          cumulative += remainingTeams[i].weight;
          if (randomNum <= cumulative) {
            winnerIdx = i;
            break;
          }
        }

        const winner = remainingTeams[winnerIdx];
        const pick: DraftOrderTeam = {
          teamId: winner.team.team_id,
          teamName: winner.team.team_name,
          teamAbbreviation: winner.team.team_abbreviation,
          draftPosition,
          wins: winner.team.wins,
          losses: winner.team.losses,
          winPercentage: winner.team.win_percentage,
          standingsRank: winner.standingsRank,
          isLocked: false,
          lotteryOdds: winner.odds,
          lotteryNumber: randomNum,
        };

        draftOrder.push(pick);
        lotteryPicks.push(pick);
        lotteryLog.push(`Pick ${draftPosition}: ${winner.team.team_name} (${winner.team.wins}-${winner.team.losses}) - LOTTERY WINNER (had ${winner.odds.toFixed(1)}% odds)`);

        // Remove winner from pool
        remainingTeams.splice(winnerIdx, 1);
        draftPosition++;
      }
    }

    lotteryLog.push('');
    lotteryLog.push('=== FINAL DRAFT ORDER ===');
    draftOrder.forEach(pick => {
      lotteryLog.push(`${pick.draftPosition}. ${pick.teamAbbreviation} - ${pick.teamName} (${pick.wins}-${pick.losses}) ${pick.isLocked ? '[LOCKED]' : '[LOTTERY]'}`);
    });

    return {
      success: true,
      draftOrder,
      lockedPicks,
      lotteryPicks,
      lotteryLog,
      excludedTeams: excludedTeamNames,
    };
  } catch (err: any) {
    console.error('Error calculating draft order:', err);
    return { success: false, error: err.message };
  }
}

// Save calculated draft order
export async function saveDraftOrder(
  seasonNumber: number,
  draftOrder: DraftOrderTeam[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update final standings with draft position
    for (const team of draftOrder) {
      await supabase
        .from('final_standings')
        .update({
          draft_position: team.draftPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('season_number', seasonNumber)
        .eq('team_id', team.teamId);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving draft order:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// FREE AGENT DECLARATIONS
// =============================================================================

// Get all free agent declarations for a season
export async function getFreeAgentDeclarations(seasonNumber: number): Promise<DBFreeAgentDeclaration[]> {
  try {
    const { data, error } = await supabase
      .from('free_agent_declarations')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('declared_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching free agent declarations:', err);
    return [];
  }
}

// Get available (unclaimed) free agents
export async function getAvailableFreeAgents(seasonNumber: number): Promise<DBFreeAgentDeclaration[]> {
  try {
    const { data, error } = await supabase
      .from('free_agent_declarations')
      .select('*')
      .eq('season_number', seasonNumber)
      .eq('is_claimed', false)
      .order('overall_rating', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching available free agents:', err);
    return [];
  }
}

// Get user's free agent declarations for THEIR OWN TEAM only (for tier validation)
export async function getUserDeclarations(userId: string, seasonNumber: number, teamId?: string): Promise<DBFreeAgentDeclaration[]> {
  try {
    // If we have a team_id, get declarations for THAT team only
    // This is important for admins who may declare for multiple teams
    if (teamId && teamId !== 'admin' && teamId !== 'null') {
      const { data: byTeam, error: teamError } = await supabase
        .from('free_agent_declarations')
        .select('*')
        .eq('declaring_team_id', teamId.toLowerCase())
        .eq('season_number', seasonNumber)
        .order('declared_at', { ascending: false });

      if (!teamError && byTeam && byTeam.length > 0) {
        console.log('[getUserDeclarations] Found', byTeam.length, 'declarations for team:', teamId);
        return byTeam;
      }
    }

    // Fallback: get declarations by user_id that match their team
    // For admins, we need to find their actual managed team
    const { data: byUser, error: userError } = await supabase
      .from('free_agent_declarations')
      .select('*')
      .eq('declaring_user_id', userId)
      .eq('season_number', seasonNumber)
      .order('declared_at', { ascending: false });

    if (!userError && byUser && byUser.length > 0) {
      // For admins (teamId is 'admin' or null), we need to figure out their actual team
      // by looking at which team they're MOST associated with (most declarations or first one)
      const isAdminOrNull = !teamId || teamId === 'admin' || teamId === 'null';
      
      if (isAdminOrNull) {
        // Count declarations per team to find their primary team
        const teamCounts: Record<string, number> = {};
        byUser.forEach(d => {
          const team = d.declaring_team_id?.toLowerCase() || 'unknown';
          teamCounts[team] = (teamCounts[team] || 0) + 1;
        });
        
        // Find team with most declarations
        let primaryTeam = byUser[0]?.declaring_team_id;
        let maxCount = 0;
        Object.entries(teamCounts).forEach(([team, count]) => {
          if (count > maxCount) {
            maxCount = count;
            primaryTeam = team;
          }
        });
        
        const filtered = byUser.filter(d => 
          d.declaring_team_id?.toLowerCase() === primaryTeam?.toLowerCase()
        );
        
        console.log('[getUserDeclarations] Admin mode: using team', primaryTeam, 'with', filtered.length, 'declarations');
        return filtered;
      }
      
      // Regular user with valid team_id
      const filtered = byUser.filter(d => 
        d.declaring_team_id?.toLowerCase() === teamId?.toLowerCase()
      );
      
      if (filtered.length > 0) {
        console.log('[getUserDeclarations] Filtered to', filtered.length, 'declarations for team:', teamId);
        return filtered;
      }
      
      // If no match for their team, return first team's declarations
      const firstTeam = byUser[0]?.declaring_team_id;
      const firstTeamDecs = byUser.filter(d => d.declaring_team_id === firstTeam);
      console.log('[getUserDeclarations] Using first team declarations:', firstTeam, 'count:', firstTeamDecs.length);
      return firstTeamDecs;
    }

    console.log('[getUserDeclarations] No declarations found for user:', userId);
    return [];
  } catch (err) {
    console.error('Error fetching user declarations:', err);
    return [];
  }
}

// Submit a free agent declaration
export async function submitFreeAgentDeclaration(declaration: {
  season_number: number;
  declaring_team_id: string;
  declaring_user_id: string;
  declaring_team_name?: string;
  declaring_user_name?: string;
  player_name: string;
  position: string;
  classification: PlayerClassification;
  overall_rating: number;
  player_uuid?: string;
  card_img?: string;
  team_short_name?: string;
}): Promise<{ success: boolean; declaration?: DBFreeAgentDeclaration; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    // Check for duplicate BEFORE inserting (prevents race conditions)
    const { data: existing } = await supabase
      .from('free_agent_declarations')
      .select('id, player_name')
      .eq('declaring_user_id', declaration.declaring_user_id)
      .eq('player_name', declaration.player_name)
      .eq('season_number', declaration.season_number)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return { 
        success: false, 
        error: `You have already declared ${declaration.player_name}. Each player can only be declared once.` 
      };
    }
    
    const { data, error } = await supabase
      .from('free_agent_declarations')
      .insert({
        ...declaration,
        declared_at: now,
        is_locked: true,       // Immediately locked - cannot be removed or changed
        locked_at: now,        // Record when it was locked
        is_claimed: false,
      })
      .select()
      .single();

    if (error) throw error;
    
    // Log the declaration activity
    try {
      await supabase.from('declaration_activity_log').insert({
        declaration_id: data.id,
        user_id: declaration.declaring_user_id,
        user_name: declaration.declaring_user_name,
        team_name: declaration.declaring_team_name,
        action_type: 'submitted',
        player_name: declaration.player_name,
        position: declaration.position,
        classification: declaration.classification,
        overall_rating: declaration.overall_rating,
        player_uuid: declaration.player_uuid,
        season_number: declaration.season_number,
        activity_at: now,
      });
    } catch (logErr) {
      console.warn('Failed to log declaration activity:', logErr);
    }
    
    return { success: true, declaration: data };
  } catch (err: any) {
    console.error('Error submitting free agent declaration:', err);
    return { success: false, error: err.message };
  }
}

// Check if a player has already been declared by this user
export async function checkDuplicateDeclaration(
  userId: string, 
  playerName: string, 
  seasonNumber: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('free_agent_declarations')
      .select('id')
      .eq('declaring_user_id', userId)
      .eq('player_name', playerName)
      .eq('season_number', seasonNumber)
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (err) {
    console.error('Error checking duplicate declaration:', err);
    return false;
  }
}

// Get all declarations for the master free agent list (with team/user info)
export async function getMasterFreeAgentList(seasonNumber: number): Promise<DBFreeAgentDeclaration[]> {
  try {
    const { data, error } = await supabase
      .from('free_agent_declarations')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('declared_at', { ascending: true }); // Show in order declared

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching master free agent list:', err);
    return [];
  }
}

// Commissioner: Delete a free agent declaration
export async function deleteFreeAgentDeclaration(declarationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('free_agent_declarations')
      .delete()
      .eq('id', declarationId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting free agent declaration:', err);
    return { success: false, error: err.message };
  }
}

// Commissioner: Delete all declarations by a specific user
export async function deleteUserDeclarations(userId: string, seasonNumber: number): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('free_agent_declarations')
      .delete()
      .eq('declaring_user_id', userId)
      .eq('season_number', seasonNumber)
      .select();

    if (error) throw error;
    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    console.error('Error deleting user declarations:', err);
    return { success: false, count: 0, error: err.message };
  }
}

// =============================================================================
// FREE AGENT CLAIMS
// =============================================================================

// Get all claims for a season
export async function getFreeAgentClaims(seasonNumber: number): Promise<DBFreeAgentClaim[]> {
  try {
    const { data, error } = await supabase
      .from('free_agent_claims')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching free agent claims:', err);
    return [];
  }
}

// Get user's claims
export async function getUserClaims(userId: string, seasonNumber: number): Promise<DBFreeAgentClaim[]> {
  try {
    const { data, error } = await supabase
      .from('free_agent_claims')
      .select('*')
      .eq('claiming_user_id', userId)
      .eq('season_number', seasonNumber)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching user claims:', err);
    return [];
  }
}

// Submit a free agent claim
export async function submitFreeAgentClaim(claim: {
  season_number: number;
  claiming_team_id: string;
  claiming_user_id: string;
  claiming_team_record?: string;
  claiming_team_wins?: number;
  target_free_agent_id: string;
  target_player_name: string;
  target_classification: PlayerClassification;
  offered_player_name: string;
  offered_position: string;
  offered_classification: PlayerClassification;
  offered_overall_rating: number;
}): Promise<{ success: boolean; claim?: DBFreeAgentClaim; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('free_agent_claims')
      .insert({
        ...claim,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, claim: data };
  } catch (err: any) {
    console.error('Error submitting free agent claim:', err);
    return { success: false, error: err.message };
  }
}

// New: Submit claims with 3 choices (private, locked once submitted)
export interface ClaimSubmission {
  season_number: number;
  claiming_team_id: string;
  claiming_team_name: string;
  claiming_user_id: string;
  // 3 choices - player names from the free agent pool
  choice_1_player: string;
  choice_1_classification: string;
  choice_2_player: string | null;
  choice_2_classification: string | null;
  choice_3_player: string | null;
  choice_3_classification: string | null;
  // Legacy fields (no longer used)
  offered_player_name: string | null;
  offered_classification: string | null;
  offered_overall: number;
}

export interface DBClaimSubmission {
  id: string;
  season_number: number;
  claiming_team_id: string;
  claiming_team_name: string;
  claiming_user_id: string;
  choice_1_player: string;
  choice_1_classification: string;
  choice_2_player: string | null;
  choice_2_classification: string | null;
  choice_3_player: string | null;
  choice_3_classification: string | null;
  offered_player_name: string | null;
  offered_classification: string | null;
  offered_overall: number;
  submitted_at: string;
  is_locked: boolean;
  status: 'pending' | 'processed';
  created_at: string;
}

export async function submitClaimChoices(claim: ClaimSubmission): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user already submitted a claim this season (claims are locked)
    const { data: existing } = await supabase
      .from('claim_submissions')
      .select('id')
      .eq('claiming_user_id', claim.claiming_user_id)
      .eq('season_number', claim.season_number)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return { success: false, error: 'You have already submitted a claim this season. Claims are locked and cannot be changed.' };
    }

    const { error } = await supabase
      .from('claim_submissions')
      .insert({
        ...claim,
        submitted_at: new Date().toISOString(),
        is_locked: true,
        status: 'pending',
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error submitting claim choices:', err);
    return { success: false, error: err.message };
  }
}

// Get user's claim submission (matches by user_id OR team_id for robustness)
export async function getUserClaimSubmission(userId: string, seasonNumber: number, teamId?: string): Promise<DBClaimSubmission | null> {
  try {
    // First try by user_id
    const { data: byUser, error: userError } = await supabase
      .from('claim_submissions')
      .select('*')
      .eq('claiming_user_id', userId)
      .eq('season_number', seasonNumber)
      .single();

    if (!userError && byUser) {
      return byUser;
    }

    // Fallback: try by team_id if provided
    if (teamId) {
      const { data: byTeam, error: teamError } = await supabase
        .from('claim_submissions')
        .select('*')
        .eq('claiming_team_id', teamId.toLowerCase())
        .eq('season_number', seasonNumber)
        .single();

      if (!teamError && byTeam) {
        return byTeam;
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching user claim:', err);
    return null;
  }
}

// Commissioner only: Get all claim submissions
export async function getAllClaimSubmissions(seasonNumber: number): Promise<DBClaimSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('claim_submissions')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching all claims:', err);
    return [];
  }
}

// Commissioner only: Delete a claim submission by ID
export async function deleteClaimSubmission(claimId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('claim_submissions')
      .delete()
      .eq('id', claimId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting claim submission:', err);
    return { success: false, error: err.message };
  }
}

// Commissioner only: Delete a claim submission by user ID
export async function deleteClaimSubmissionByUserId(userId: string, seasonNumber: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('claim_submissions')
      .delete()
      .eq('claiming_user_id', userId)
      .eq('season_number', seasonNumber);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting claim submission:', err);
    return { success: false, error: err.message };
  }
}

// Commissioner only: Delete a claim submission by team ID
export async function deleteClaimSubmissionByTeamId(teamId: string, seasonNumber: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('claim_submissions')
      .delete()
      .eq('claiming_team_id', teamId.toLowerCase())
      .eq('season_number', seasonNumber);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting claim submission by team:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// SIGNINGS / CLAIM RESOLUTION
// =============================================================================

export interface DBSigning {
  id: string;
  season_number: number;
  signing_team_id: string;
  signing_team_name: string;
  player_name: string;
  player_classification: string;
  player_overall?: number;
  contract_years: number;
  contract_value: number;
  contract_display: string;
  from_team_id?: string;
  from_team_name?: string;
  offered_player_name?: string;
  offered_classification?: string;
  signing_type: 'claim' | 'priority_claim' | 'direct';
  announcement_text?: string;
  signed_at: string;
  created_at: string;
}

export async function getSignings(seasonNumber: number): Promise<DBSigning[]> {
  try {
    const { data, error } = await supabase
      .from('signings')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('signed_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching signings:', err);
    return [];
  }
}

export async function createSigning(signing: Omit<DBSigning, 'id' | 'created_at'>): Promise<{ success: boolean; signing?: DBSigning; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('signings')
      .insert({
        ...signing,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, signing: data };
  } catch (err: any) {
    console.error('Error creating signing:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteSigning(signingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('signings')
      .delete()
      .eq('id', signingId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting signing:', err);
    return { success: false, error: err.message };
  }
}

export async function updateClaimSubmissionStatus(
  claimId: string, 
  status: 'pending' | 'processed'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('claim_submissions')
      .update({ status })
      .eq('id', claimId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating claim status:', err);
    return { success: false, error: err.message };
  }
}

export async function getTeamSigningsCount(teamId: string, seasonNumber: number): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('signings')
      .select('*', { count: 'exact', head: true })
      .eq('signing_team_id', teamId)
      .eq('season_number', seasonNumber);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('Error getting team signings count:', err);
    return 0;
  }
}

// Process a claim (commissioner only)
export async function processFreeAgentClaim(
  claimId: string,
  status: 'approved' | 'denied',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('free_agent_claims')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', claimId);

    if (error) throw error;

    // If approved, mark the free agent as claimed
    if (status === 'approved') {
      const { data: claim } = await supabase
        .from('free_agent_claims')
        .select('target_free_agent_id, claiming_team_id')
        .eq('id', claimId)
        .single();

      if (claim) {
        await supabase
          .from('free_agent_declarations')
          .update({
            is_claimed: true,
            claimed_by_team_id: claim.claiming_team_id,
            claimed_at: new Date().toISOString(),
          })
          .eq('id', claim.target_free_agent_id);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error processing claim:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// QUESTIONNAIRE STATUS
// =============================================================================

// Get questionnaire status for a user
export async function getQuestionnaireStatus(userId: string, seasonNumber: number): Promise<DBQuestionnaireStatus | null> {
  try {
    const { data, error } = await supabase
      .from('questionnaire_status')
      .select('*')
      .eq('user_id', userId)
      .eq('season_number', seasonNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  } catch (err) {
    console.error('Error fetching questionnaire status:', err);
    return null;
  }
}

// Mark questionnaire as completed
export async function completeQuestionnaire(
  userId: string,
  seasonNumber: number,
  responses: {
    continuing_participation: boolean;
    team_retention_preference: 'keep' | 'switch' | 'open';
    requested_team?: string;
    feedback?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('questionnaire_status')
      .upsert({
        user_id: userId,
        season_number: seasonNumber,
        completed: true,
        completed_at: new Date().toISOString(),
        ...responses,
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error completing questionnaire:', err);
    return { success: false, error: err.message };
  }
}

// Get all questionnaire completions for admin
export async function getAllQuestionnaireStatus(seasonNumber: number): Promise<DBQuestionnaireStatus[]> {
  try {
    const { data, error } = await supabase
      .from('questionnaire_status')
      .select('*')
      .eq('season_number', seasonNumber);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching all questionnaire status:', err);
    return [];
  }
}

// Mark all active members' questionnaires as complete (commissioner action)
export async function markAllQuestionnairesComplete(seasonNumber: number): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get all active JKAP members
    const users = await getAllUsers();
    const activeMembers = users.filter(u => u.user_type === 'jkap_member');
    
    let successCount = 0;
    for (const member of activeMembers) {
      const { error } = await supabase
        .from('questionnaire_status')
        .upsert({
          user_id: member.id,
          season_number: seasonNumber,
          completed: true,
          completed_at: new Date().toISOString(),
          continuing_participation: true,
          team_retention_preference: 'keep',
        }, { onConflict: 'user_id,season_number' });
      
      if (!error) successCount++;
    }
    
    return { success: true, count: successCount };
  } catch (err: any) {
    console.error('Error marking all questionnaires complete:', err);
    return { success: false, count: 0, error: err.message };
  }
}

// Get off-season progress summary for admin
export async function getOffseasonProgressSummary(seasonNumber: number): Promise<{
  totalMembers: number;
  questionnaireCompleted: number;
  declarationsSubmitted: number;
  claimsSubmitted: number;
}> {
  try {
    const [questionnaires, declarations, claims, users] = await Promise.all([
      getAllQuestionnaireStatus(seasonNumber),
      getFreeAgentDeclarations(seasonNumber),
      getFreeAgentClaims(seasonNumber),
      getAllUsers(),
    ]);

    const jkapMembers = users.filter(u => u.user_type === 'jkap_member' && !u.is_admin);

    return {
      totalMembers: jkapMembers.length,
      questionnaireCompleted: questionnaires.filter(q => q.completed).length,
      declarationsSubmitted: new Set(declarations.map(d => d.declaring_user_id)).size,
      claimsSubmitted: claims.length,
    };
  } catch (err) {
    console.error('Error fetching offseason progress summary:', err);
    return {
      totalMembers: 0,
      questionnaireCompleted: 0,
      declarationsSubmitted: 0,
      claimsSubmitted: 0,
    };
  }
}

// =============================================================================
// MEMBER STATUS TRACKING
// =============================================================================

export interface DBMemberStatus {
  id: string;
  user_id: string;
  is_active: boolean;
  last_active_at: string;
  activity_score: number;
  phone_number: string | null;
  sms_opted_in: boolean;
  email_opted_in: boolean;
  seasons_participated: string[];
  total_games_played: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Get all active members with their contact info
export async function getActiveMembers(): Promise<(DBMemberStatus & { user?: DBUser })[]> {
  try {
    const { data, error } = await supabase
      .from('member_status')
      .select(`
        *,
        user:users(*)
      `)
      .eq('is_active', true)
      .order('last_active_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching active members:', err);
    return [];
  }
}

// Get members with contact info for SMS export
export async function getMembersForSMS(): Promise<{
  id: string;
  name: string;
  phone: string;
  email: string;
  teamId: string;
  isActive: boolean;
}[]> {
  try {
    const { data, error } = await supabase
      .from('member_status')
      .select(`
        *,
        user:users(display_name, email, team_id)
      `)
      .eq('is_active', true)
      .eq('sms_opted_in', true)
      .order('last_active_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((m: any) => ({
      id: m.user_id,
      name: m.user?.display_name || 'Unknown',
      phone: m.phone_number || '',
      email: m.user?.email || '',
      teamId: m.user?.team_id || '',
      isActive: m.is_active,
    }));
  } catch (err) {
    console.error('Error fetching members for SMS:', err);
    return [];
  }
}

// Update member status
export async function updateMemberStatus(
  userId: string,
  status: Partial<DBMemberActivity>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('member_status')
      .upsert({
        user_id: userId,
        ...status,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating member status:', err);
    return { success: false, error: err.message };
  }
}

// Log off-season specific activity (questionnaire, voting, declarations, claims)
export async function logOffseasonActivity(
  userId: string,
  activityType: 'questionnaire' | 'vote' | 'declaration' | 'claim' | 'login',
  description?: string,
  seasonNumber?: number
): Promise<void> {
  try {
    await supabase.from('offseason_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      activity_description: description,
      season_number: seasonNumber,
      activity_at: new Date().toISOString(),
    });

    // Also update last_active_at in member_status
    await supabase
      .from('member_status')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (err) {
    console.error('Error logging offseason activity:', err);
  }
}

// =============================================================================
// AWARD VOTING
// =============================================================================

export interface DBAwardVote {
  id: string;
  season_number: number;
  user_id: string;
  team_id: string;
  mvp_vote: string;
  cy_young_vote: string;
  submitted_at: string;
  created_at: string;
}

export interface DBAwardCandidate {
  id: string;
  season_number: number;
  award_type: 'mvp' | 'cy_young' | 'rookie' | 'relief';
  player_name: string;
  team_abbr: string;
  stats: Record<string, any>;
  rank_position: number;
  is_finalist: boolean;
  created_at: string;
}

// Get award candidates for a season
export async function getAwardCandidates(
  seasonNumber: number,
  awardType?: 'mvp' | 'cy_young'
): Promise<DBAwardCandidate[]> {
  try {
    let query = supabase
      .from('award_candidates')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('rank_position', { ascending: true });

    if (awardType) {
      query = query.eq('award_type', awardType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching award candidates:', err);
    return [];
  }
}

// Submit award vote
export async function submitAwardVote(vote: {
  season_number: number;
  user_id: string;
  team_id: string;
  mvp_vote: string;
  cy_young_vote: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('award_votes').upsert({
      ...vote,
      submitted_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error submitting award vote:', err);
    return { success: false, error: err.message };
  }
}

// Get user's vote
export async function getUserAwardVote(
  userId: string,
  seasonNumber: number
): Promise<DBAwardVote | null> {
  try {
    const { data, error } = await supabase
      .from('award_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('season_number', seasonNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error('Error fetching user award vote:', err);
    return null;
  }
}

// Get vote results (admin)
export async function getAwardVoteResults(seasonNumber: number): Promise<{
  mvpResults: { player: string; votes: number }[];
  cyYoungResults: { player: string; votes: number }[];
  totalVotes: number;
}> {
  try {
    const { data, error } = await supabase
      .from('award_votes')
      .select('*')
      .eq('season_number', seasonNumber);

    if (error) throw error;

    const votes = data || [];
    const mvpCounts: Record<string, number> = {};
    const cyYoungCounts: Record<string, number> = {};

    votes.forEach((v: DBAwardVote) => {
      mvpCounts[v.mvp_vote] = (mvpCounts[v.mvp_vote] || 0) + 1;
      cyYoungCounts[v.cy_young_vote] = (cyYoungCounts[v.cy_young_vote] || 0) + 1;
    });

    return {
      mvpResults: Object.entries(mvpCounts)
        .map(([player, voteCount]) => ({ player, votes: voteCount }))
        .sort((a, b) => b.votes - a.votes),
      cyYoungResults: Object.entries(cyYoungCounts)
        .map(([player, voteCount]) => ({ player, votes: voteCount }))
        .sort((a, b) => b.votes - a.votes),
      totalVotes: votes.length,
    };
  } catch (err) {
    console.error('Error fetching award vote results:', err);
    return { mvpResults: [], cyYoungResults: [], totalVotes: 0 };
  }
}

// =============================================================================
// WINTER LEAGUE
// =============================================================================

export interface DBWinterLeagueTeam {
  id: string;
  season_number: number;
  team_id: string;
  user_id: string;
  wins: number;
  losses: number;
  games_played: number;
  is_active: boolean;
  last_game_at: string | null;
  created_at: string;
}

export interface DBWinterLeagueGame {
  id: string;
  season_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_team_id: string;
  played_at: string;
  reported_by: string;
  created_at: string;
}

// Get winter league standings
export async function getWinterLeagueStandings(seasonNumber: number): Promise<DBWinterLeagueTeam[]> {
  try {
    const { data, error } = await supabase
      .from('winter_league_teams')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('wins', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching winter league standings:', err);
    return [];
  }
}

// Get winter league games
export async function getWinterLeagueGames(seasonNumber: number): Promise<DBWinterLeagueGame[]> {
  try {
    const { data, error } = await supabase
      .from('winter_league_games')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('played_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching winter league games:', err);
    return [];
  }
}

// Report winter league game result
export async function reportWinterLeagueGame(game: {
  season_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  reported_by: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const winnerId = game.home_score > game.away_score ? game.home_team_id : game.away_team_id;
    const loserId = game.home_score > game.away_score ? game.away_team_id : game.home_team_id;

    // Insert game record
    const { error: gameError } = await supabase.from('winter_league_games').insert({
      ...game,
      winner_team_id: winnerId,
      played_at: new Date().toISOString(),
    });

    if (gameError) throw gameError;

    // Update winner's record
    await supabase.rpc('increment_winter_league_wins', {
      p_season: game.season_number,
      p_team_id: winnerId,
    });

    // Update loser's record
    await supabase.rpc('increment_winter_league_losses', {
      p_season: game.season_number,
      p_team_id: loserId,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error reporting winter league game:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// FINAL STANDINGS (Commissioner-Controlled)
// =============================================================================

export interface DBFinalStanding {
  id: string;
  season_number: number;
  team_id: string;
  team_name: string;
  team_abbreviation: string;
  wins: number;
  losses: number;
  win_percentage: number;
  games_back: number;
  division?: string;
  division_rank?: number;
  league_rank?: number;
  overall_rank: number;
  made_playoffs: boolean;
  playoff_seed?: number;
  recorded_at: string;
  created_at: string;
}

// Get final standings for a season
export async function getFinalStandings(seasonNumber: number): Promise<DBFinalStanding[]> {
  try {
    const { data, error } = await supabase
      .from('final_standings')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('overall_rank', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching final standings:', err);
    return [];
  }
}

// Get draft order (reverse of final standings - worst team picks first)
export async function getDraftOrder(seasonNumber: number): Promise<DBFinalStanding[]> {
  try {
    const { data, error } = await supabase
      .from('final_standings')
      .select('*')
      .eq('season_number', seasonNumber)
      .order('overall_rank', { ascending: false }); // Reverse order

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching draft order:', err);
    return [];
  }
}

// Save final standings (commissioner only)
export async function saveFinalStandings(
  seasonNumber: number,
  standings: {
    team_id: string;
    team_name: string;
    team_abbreviation: string;
    wins: number;
    losses: number;
    overall_rank: number;
    made_playoffs: boolean;
    playoff_seed?: number;
  }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing standings for this season
    await supabase
      .from('final_standings')
      .delete()
      .eq('season_number', seasonNumber);

    // Calculate win percentage and games back
    const topWins = standings[0]?.wins || 0;
    const topLosses = standings[0]?.losses || 0;

    const processedStandings = standings.map((s, index) => {
      const totalGames = s.wins + s.losses;
      const winPct = totalGames > 0 ? s.wins / totalGames : 0;
      const gb = index === 0 ? 0 : ((topWins - s.wins) + (s.losses - topLosses)) / 2;

      return {
        season_number: seasonNumber,
        team_id: s.team_id,
        team_name: s.team_name,
        team_abbreviation: s.team_abbreviation,
        wins: s.wins,
        losses: s.losses,
        win_percentage: Number(winPct.toFixed(3)),
        games_back: Number(gb.toFixed(1)),
        overall_rank: s.overall_rank,
        made_playoffs: s.made_playoffs,
        playoff_seed: s.playoff_seed,
        recorded_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('final_standings')
      .insert(processedStandings);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error saving final standings:', err);
    return { success: false, error: err.message };
  }
}

// Update single team standing
export async function updateTeamStanding(
  standingId: string,
  updates: Partial<DBFinalStanding>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('final_standings')
      .update(updates)
      .eq('id', standingId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating team standing:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// NOTIFICATION SYSTEM
// System-wide notifications for all users
// =============================================================================

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory = 'announcement' | 'system' | 'update' | 'reminder' | 'welcome';

export interface DBNotification {
  id: string;
  title: string;
  content: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  action_url?: string;
  action_label?: string;
  icon?: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  created_by?: string;
}

export interface DBUserNotificationRead {
  id: string;
  user_id: string;
  notification_id: string;
  read_at: string;
  dismissed: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'jkap_notifications';
const NOTIFICATIONS_READ_KEY = 'jkap_notifications_read';

// Default system notifications (used as fallback if DB is not available)
const DEFAULT_NOTIFICATIONS: DBNotification[] = [
  {
    id: 'claiming-period-open-2024',
    title: '🚨 CLAIMING PERIOD IS NOW OPEN!',
    content: 'The free agent claiming window is LIVE! Head to the Off-Season Hub and submit your claims. Pick up to 3 players in order of preference. WARNING: Once you submit, your claim is LOCKED and cannot be changed. Worst record gets priority if multiple teams claim the same player. Max 2 successful claims per team.',
    category: 'announcement',
    priority: 'urgent',
    action_url: '/offseason?tab=claims',
    action_label: 'Submit Your Claim',
    icon: '🎯',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fa-declaration-guide-2024',
    title: '⚾ Time to DFA Your Players!',
    content: 'Go to Off-Season → "Declare Free Agents" tab. IMPORTANT: Check your IN-GAME ROSTER in MLB The Show and pick players FROM YOUR TEAM in the game. Do NOT enter random players - only players currently on your team!',
    category: 'announcement',
    priority: 'urgent',
    action_url: '/offseason?tab=free-agents',
    action_label: 'Declare Now',
    icon: '⚾',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'discord-link-update-2024',
    title: '📢 New Discord Server Link',
    content: 'Our Discord invite link has been updated! Click below to join or rejoin the server with the new link. Make sure you\'re connected to stay up to date with league announcements, matchup coordination, and community chat.',
    category: 'announcement',
    priority: 'high',
    action_url: 'https://discord.gg/AMDGBuP5',
    action_label: 'Join Discord',
    icon: '💬',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Get all active notifications
export async function getNotifications(): Promise<DBNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Notifications] Supabase error, using defaults:', error);
      return getLocalNotifications();
    }

    // Merge with any local-only notifications
    const localNotifications = getLocalNotifications();
    const dbIds = new Set(data?.map(n => n.id) || []);
    const uniqueLocalNotifications = localNotifications.filter(n => !dbIds.has(n.id));

    return [...(data || []), ...uniqueLocalNotifications];
  } catch (err) {
    console.error('[Notifications] Error fetching notifications:', err);
    return getLocalNotifications();
  }
}

// Get notifications from localStorage (fallback/offline support)
function getLocalNotifications(): DBNotification[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return [...DEFAULT_NOTIFICATIONS, ...parsed];
    }
  } catch (e) {
    console.error('Error reading local notifications:', e);
  }
  
  return DEFAULT_NOTIFICATIONS;
}

// Get user's read status for notifications
export async function getUserNotificationReads(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('user_notification_reads')
      .select('notification_id')
      .eq('user_id', userId);

    if (error) {
      console.error('[Notifications] Error fetching read status:', error);
      return getLocalReadStatus(userId);
    }

    const readIds = new Set(data?.map(r => r.notification_id) || []);
    
    // Merge with local read status
    const localReads = getLocalReadStatus(userId);
    localReads.forEach(id => readIds.add(id));
    
    return readIds;
  } catch (err) {
    console.error('[Notifications] Error fetching read status:', err);
    return getLocalReadStatus(userId);
  }
}

// Get local read status (fallback)
function getLocalReadStatus(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_READ_KEY);
    if (stored) {
      const allReads = JSON.parse(stored);
      return new Set(allReads[userId] || []);
    }
  } catch (e) {
    console.error('Error reading local notification reads:', e);
  }
  
  return new Set();
}

// Mark a notification as read
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  // Always save locally first for immediate UI feedback
  saveLocalReadStatus(userId, notificationId);
  
  try {
    const { error } = await supabase
      .from('user_notification_reads')
      .upsert({
        user_id: userId,
        notification_id: notificationId,
        read_at: new Date().toISOString(),
        dismissed: false,
      }, {
        onConflict: 'user_id,notification_id',
      });

    if (error) {
      console.error('[Notifications] Error marking as read:', error);
      return { success: true }; // Still return success since we saved locally
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Notifications] Error marking as read:', err);
    return { success: true }; // Still return success since we saved locally
  }
}

// Save read status locally
function saveLocalReadStatus(userId: string, notificationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_READ_KEY);
    const allReads = stored ? JSON.parse(stored) : {};
    
    if (!allReads[userId]) {
      allReads[userId] = [];
    }
    
    if (!allReads[userId].includes(notificationId)) {
      allReads[userId].push(notificationId);
    }
    
    localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(allReads));
  } catch (e) {
    console.error('Error saving local read status:', e);
  }
}

// Mark all notifications as read
export async function markAllNotificationsRead(userId: string): Promise<{ success: boolean }> {
  try {
    const notifications = await getNotifications();
    
    for (const notification of notifications) {
      await markNotificationRead(userId, notification.id);
    }
    
    return { success: true };
  } catch (err) {
    console.error('[Notifications] Error marking all as read:', err);
    return { success: false };
  }
}

// Create a new notification (admin only)
export async function createNotification(
  notification: Omit<DBNotification, 'id' | 'created_at'>
): Promise<{ success: boolean; notification?: DBNotification; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Notifications] Error creating notification:', error);
      // Fall back to local storage
      const localNotification: DBNotification = {
        ...notification,
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      saveLocalNotification(localNotification);
      return { success: true, notification: localNotification };
    }

    return { success: true, notification: data };
  } catch (err: any) {
    console.error('[Notifications] Error creating notification:', err);
    return { success: false, error: err.message };
  }
}

// Save notification locally
function saveLocalNotification(notification: DBNotification): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const notifications = stored ? JSON.parse(stored) : [];
    notifications.unshift(notification);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Error saving local notification:', e);
  }
}

// Delete a notification (admin only)
export async function deleteNotification(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Notifications] Error deleting notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Notifications] Error deleting notification:', err);
    return { success: false, error: err.message };
  }
}

// Update a notification (admin only)
export async function updateNotification(
  id: string,
  updates: Partial<DBNotification>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[Notifications] Error updating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Notifications] Error updating notification:', err);
    return { success: false, error: err.message };
  }
}

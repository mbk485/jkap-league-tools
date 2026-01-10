import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zroiqbyswhawjbblpmwm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyb2lxYnlzd2hhd2piYmxwbXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Nzc2MTAsImV4cCI6MjA4MzM1MzYxMH0.Cxx2Q3_TKs1g3onePunW1NK1ys7Ai_qMN4MPCcEyYIA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  updates: Partial<Pick<DBUser, 'display_name' | 'team_id' | 'username'>>
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

// =============================================================================
// LEAGUE SETTINGS (Central configuration for all users)
// =============================================================================

export interface LeagueSettings {
  id?: string;
  discord_webhook_url: string | null;
  auto_post_discord: boolean;
  announcement_style: 'espn' | 'simple';
  openai_api_key: string | null;  // Centralized API key for whole league
  updated_at?: string;
}

const DEFAULT_SETTINGS: LeagueSettings = {
  discord_webhook_url: null,
  auto_post_discord: false,
  announcement_style: 'espn',
  openai_api_key: null,
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
      auto_post_discord: data.auto_post_discord ?? false,
      announcement_style: data.announcement_style ?? 'espn',
      openai_api_key: data.openai_api_key ?? null,
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
      if (settings.auto_post_discord !== undefined) updateData.auto_post_discord = settings.auto_post_discord;
      if (settings.announcement_style !== undefined) updateData.announcement_style = settings.announcement_style;
      if (settings.openai_api_key !== undefined) updateData.openai_api_key = settings.openai_api_key;

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
          auto_post_discord: settings.auto_post_discord ?? false,
          announcement_style: settings.announcement_style ?? 'espn',
          openai_api_key: settings.openai_api_key ?? null,
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


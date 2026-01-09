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
  updated_at?: string;
}

const DEFAULT_SETTINGS: LeagueSettings = {
  discord_webhook_url: null,
  auto_post_discord: false,
  announcement_style: 'espn',
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
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Error fetching league settings:', err);
    return DEFAULT_SETTINGS;
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
      // Update existing
      const { error } = await supabase
        .from('league_settings')
        .update({
          discord_webhook_url: settings.discord_webhook_url,
          auto_post_discord: settings.auto_post_discord,
          announcement_style: settings.announcement_style,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('league_settings')
        .insert({
          discord_webhook_url: settings.discord_webhook_url,
          auto_post_discord: settings.auto_post_discord ?? false,
          announcement_style: settings.announcement_style ?? 'espn',
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


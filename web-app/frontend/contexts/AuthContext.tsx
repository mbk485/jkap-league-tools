'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, MLB_TEAMS, UserType } from '@/types/league';
import { supabase, createUser, loginUser, DBUser } from '@/lib/supabase';

interface RegisterOptions {
  username: string;
  password: string;
  displayName: string;
  userType: UserType;
  teamId?: string;      // For JKAP members
  leagueName?: string;  // For external commissioners
  email?: string;       // For external commissioners (required)
  phone?: string;       // For external commissioners (required)
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (options: RegisterOptions) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => AuthUser[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'jkap_auth_user';
const USERS_STORAGE_KEY = 'jkap_users';
const ZAPIER_WEBHOOK_KEY = 'jkap_zapier_webhook';

// Function to send new commissioner data to Zapier webhook
async function sendToZapierWebhook(user: AuthUser) {
  try {
    const webhookUrl = localStorage.getItem(ZAPIER_WEBHOOK_KEY);
    if (!webhookUrl) {
      console.log('No Zapier webhook URL configured. Skipping webhook.');
      return;
    }
    
    // Format phone number (remove non-digits, add +1 if needed)
    const formattedPhone = user.phone?.replace(/\D/g, '') || '';
    const phoneWithCountry = formattedPhone.length === 10 ? `+1${formattedPhone}` : `+${formattedPhone}`;
    
    const payload = {
      name: user.displayName,
      email: user.email,
      phone: phoneWithCountry,
      league_name: user.leagueName,
      username: user.username,
      registered_at: new Date().toISOString(),
      source: 'JKAP League Tools',
    };
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors', // Zapier webhooks don't support CORS
      body: JSON.stringify(payload),
    });
    
    console.log('Sent commissioner data to Zapier webhook');
  } catch (error) {
    console.error('Failed to send to Zapier webhook:', error);
    // Don't throw - registration should still succeed even if webhook fails
  }
}

// Export function to set Zapier webhook URL (for admin settings)
export function setZapierWebhookUrl(url: string) {
  if (url) {
    localStorage.setItem(ZAPIER_WEBHOOK_KEY, url);
  } else {
    localStorage.removeItem(ZAPIER_WEBHOOK_KEY);
  }
}

export function getZapierWebhookUrl(): string | null {
  return localStorage.getItem(ZAPIER_WEBHOOK_KEY);
}

// Default admin user (always available)
const DEFAULT_ADMIN: AuthUser = {
  id: 'admin-001',
  username: 'commissioner',
  displayName: 'League Commissioner',
  userType: 'jkap_member',
  teamId: 'admin',
  teamName: 'League Office',
  teamAbbreviation: 'LO',
  isAdmin: true,
  createdAt: '2024-01-01',
};

// Initial demo users (localStorage fallback)
const INITIAL_USERS: { user: AuthUser; password: string }[] = [
  {
    user: DEFAULT_ADMIN,
    password: 'jkap2024',
  },
];

// Convert DB user to AuthUser
function dbUserToAuthUser(dbUser: DBUser): AuthUser {
  const team = MLB_TEAMS.find((t) => t.id === dbUser.team_id);
  // Determine user type based on whether they have a team or league name
  const isJkapMember = !!dbUser.team_id || dbUser.is_admin;
  
  return {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.display_name,
    userType: isJkapMember ? 'jkap_member' : 'external_commissioner',
    teamId: dbUser.team_id || (dbUser.is_admin ? 'admin' : undefined),
    teamName: team?.name || (dbUser.is_admin ? 'League Office' : undefined),
    teamAbbreviation: team?.abbreviation || (dbUser.is_admin ? 'LO' : undefined),
    leagueName: (dbUser as any).league_name, // Will be undefined if not set
    isAdmin: dbUser.is_admin,
    createdAt: dbUser.created_at.split('T')[0],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<{ user: AuthUser; password: string }[]>(INITIAL_USERS);

  // Load users and current session
  useEffect(() => {
    // Load stored users from localStorage (fallback)
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        const parsedUsers = JSON.parse(storedUsers);
        const hasAdmin = parsedUsers.some((u: { user: AuthUser }) => u.user.id === 'admin-001');
        if (!hasAdmin) {
          parsedUsers.push(INITIAL_USERS[0]);
        }
        setUsers(parsedUsers);
      } catch {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      }
    } else {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    }

    // Load current session
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // First try Supabase
    try {
      const result = await loginUser(username, password);
      if (result.success && result.user) {
        const authUser = dbUserToAuthUser(result.user);
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.log('Supabase login failed, trying localStorage fallback:', err);
    }
    
    // Fallback to localStorage
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const currentUsers = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;
    
    const foundUser = currentUsers.find(
      (u: { user: AuthUser; password: string }) => 
        u.user.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
    );
    
    if (foundUser) {
      setUser(foundUser.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser.user));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const register = async (options: RegisterOptions): Promise<{ success: boolean; error?: string }> => {
    const { username, password, displayName, userType, teamId, leagueName, email, phone } = options;
    setIsLoading(true);
    
    // Validate based on user type
    if (userType === 'jkap_member') {
      // JKAP members must select a team
      const team = MLB_TEAMS.find((t) => t.id === teamId);
      if (!team) {
        setIsLoading(false);
        return { success: false, error: 'Please select your team.' };
      }
    } else if (userType === 'external_commissioner') {
      // External commissioners must provide league name, email, and phone
      if (!leagueName || leagueName.trim().length < 2) {
        setIsLoading(false);
        return { success: false, error: 'Please enter your league name.' };
      }
      if (!email || !email.includes('@')) {
        setIsLoading(false);
        return { success: false, error: 'Please enter a valid email address.' };
      }
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        setIsLoading(false);
        return { success: false, error: 'Please enter a valid phone number.' };
      }
    }
    
    // Try Supabase first
    try {
      const result = await createUser({
        username,
        password,
        displayName,
        teamId: teamId || null,
        isAdmin: false,
        email: userType === 'external_commissioner' ? email : null,
        phone: userType === 'external_commissioner' ? phone : null,
        leagueName: userType === 'external_commissioner' ? leagueName : null,
        userType: userType || 'jkap_member',
      });
      
      if (result.success && result.user) {
        // Modify the auth user to include the correct type info
        const team = teamId ? MLB_TEAMS.find((t) => t.id === teamId) : null;
        const authUser: AuthUser = {
          id: result.user.id,
          username: result.user.username,
          displayName: result.user.display_name,
          userType,
          teamId: team?.id,
          teamName: team?.name,
          teamAbbreviation: team?.abbreviation,
          leagueName: userType === 'external_commissioner' ? leagueName : undefined,
          email: userType === 'external_commissioner' ? email : undefined,
          phone: userType === 'external_commissioner' ? phone : undefined,
          isAdmin: false,
          createdAt: result.user.created_at.split('T')[0],
        };
        
        // Send to Zapier webhook for external commissioners
        if (userType === 'external_commissioner') {
          sendToZapierWebhook(authUser);
        }
        
        // Also save to localStorage for fallback
        const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
        const currentUsers: { user: AuthUser; password: string }[] = storedUsers 
          ? JSON.parse(storedUsers) 
          : INITIAL_USERS;
        
        const newUserEntry = { user: authUser, password };
        const updatedUsers = [...currentUsers, newUserEntry];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
        
        // Log in the new user
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: result.error || 'Registration failed.' };
      }
    } catch (err: any) {
      console.log('Supabase registration failed, using localStorage fallback:', err);
    }
    
    // Fallback to localStorage only
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const currentUsers: { user: AuthUser; password: string }[] = storedUsers 
      ? JSON.parse(storedUsers) 
      : INITIAL_USERS;
    
    // Check if username already exists
    const usernameExists = currentUsers.some(
      (u) => u.user.username.toLowerCase() === username.toLowerCase()
    );
    if (usernameExists) {
      setIsLoading(false);
      return { success: false, error: 'Username already taken. Please choose another.' };
    }
    
    // For JKAP members, check if team is already claimed
    if (userType === 'jkap_member' && teamId) {
      const teamClaimed = currentUsers.some(
        (u) => u.user.teamId === teamId && !u.user.isAdmin
      );
      if (teamClaimed) {
        setIsLoading(false);
        return { success: false, error: 'This team has already been claimed by another owner.' };
      }
    }
    
    // Create new user based on type
    const team = teamId ? MLB_TEAMS.find((t) => t.id === teamId) : null;
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      username: username.toLowerCase(),
      displayName,
      userType,
      teamId: team?.id,
      teamName: team?.name,
      teamAbbreviation: team?.abbreviation,
      leagueName: userType === 'external_commissioner' ? leagueName : undefined,
      email: userType === 'external_commissioner' ? email : undefined,
      phone: userType === 'external_commissioner' ? phone : undefined,
      isAdmin: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    // Send to Zapier webhook for external commissioners
    if (userType === 'external_commissioner') {
      sendToZapierWebhook(newUser);
    }
    
    const newUserEntry = { user: newUser, password };
    const updatedUsers = [...currentUsers, newUserEntry];
    
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    setUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    
    setIsLoading(false);
    return { success: true };
  };

  const getAllUsers = (): AuthUser[] => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        const parsed = JSON.parse(storedUsers);
        return parsed.map((u: { user: AuthUser }) => u.user);
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        getAllUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

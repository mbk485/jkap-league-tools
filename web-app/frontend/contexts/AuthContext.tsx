'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, MLB_TEAMS } from '@/types/league';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string, displayName: string, teamId: string) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => AuthUser[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'jkap_auth_user';
const USERS_STORAGE_KEY = 'jkap_users';

// Default admin user (always available)
const DEFAULT_ADMIN: AuthUser = {
  id: 'admin-001',
  username: 'commissioner',
  displayName: 'League Commissioner',
  teamId: 'admin',
  teamName: 'League Office',
  teamAbbreviation: 'LO',
  isAdmin: true,
  createdAt: '2024-01-01',
};

// Initial demo users
const INITIAL_USERS: { user: AuthUser; password: string }[] = [
  {
    user: DEFAULT_ADMIN,
    password: 'jkap2024',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<{ user: AuthUser; password: string }[]>(INITIAL_USERS);

  // Load users and current session from localStorage
  useEffect(() => {
    // Load stored users
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        const parsedUsers = JSON.parse(storedUsers);
        // Ensure admin is always present
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
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Get latest users from localStorage
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

  const register = async (
    username: string, 
    password: string, 
    displayName: string, 
    teamId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Get latest users
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
    
    // Check if team is already claimed
    const teamClaimed = currentUsers.some(
      (u) => u.user.teamId === teamId && !u.user.isAdmin
    );
    if (teamClaimed) {
      setIsLoading(false);
      return { success: false, error: 'This team has already been claimed by another owner.' };
    }
    
    // Find team info
    const team = MLB_TEAMS.find((t) => t.id === teamId);
    if (!team) {
      setIsLoading(false);
      return { success: false, error: 'Invalid team selection.' };
    }
    
    // Create new user
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      username: username.toLowerCase(),
      displayName,
      teamId: team.id,
      teamName: team.name,
      teamAbbreviation: team.abbreviation,
      isAdmin: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    const newUserEntry = { user: newUser, password };
    const updatedUsers = [...currentUsers, newUserEntry];
    
    // Save to localStorage
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    // Log in the new user
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

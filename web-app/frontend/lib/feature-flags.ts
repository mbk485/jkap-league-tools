/**
 * Feature Flags System
 * 
 * Allows the commissioner to toggle features on/off for regular members.
 * Admins always see everything regardless of these flags.
 */

export interface FeatureFlags {
  // Main sections
  showDashboard: boolean;      // The Ballyard / Owner Dashboard
  showTools: boolean;          // League Tools section
  showDocuments: boolean;      // League Documents
  showFreeAgents: boolean;     // Free Agents page
  showStandings: boolean;      // Standings page
  
  // Dashboard widgets (only show if showDashboard is true)
  showAnnouncements: boolean;  // League Announcements widget
  showComingSoon: boolean;     // Coming Soon preview widget
  showQuickLinks: boolean;     // Documents/SMS quick links
  
  // Individual tools
  showInjuredList: boolean;    // IL Manager tool
  showGameRecap: boolean;      // Game Recap Creator
  showDraftBoard: boolean;     // Draft Board tool
  showPlayersAcademy: boolean; // Players Academy tool
  
  // Token Economy & Salary System (hidden until rollout)
  showTokenEconomy: boolean;   // Token/wallet system in nav & dashboard
  showLeagueHierarchy: boolean; // Road to the Show progression
  showRewards: boolean;        // Badges, streaks, leaderboards
  showGameLogger: boolean;     // Manual game logging tool
  
  // MLB The Show Integration
  showPlayerDatabase: boolean; // Live Series player search & database
  showMyTeam: boolean;         // Roster builder / My Team
  showRosterUpdates: boolean;  // Buff/Nerf tracking
  showExhibitionGames: boolean; // Simulated exhibition games
  
  // Off-Season Program
  showOffSeason: boolean;      // Off-season hub, questionnaire, free agents
}

const FEATURE_FLAGS_KEY = 'jkap_feature_flags';

// Default flags - what members see by default
const DEFAULT_FLAGS: FeatureFlags = {
  showDashboard: false,        // Hide for now - full franchise dashboard
  showTools: true,             // Show - main feature
  showDocuments: false,        // Hide for now
  showFreeAgents: true,        // Show - Free Agents in navbar
  showStandings: false,        // Hide for now
  showAnnouncements: false,    // Hide for now - not ready
  showComingSoon: false,       // Hide for now - not ready
  showQuickLinks: false,       // Hide for now - just show tools
  showInjuredList: true,       // Show - ready to use
  showGameRecap: true,         // Show - ready to use
  showDraftBoard: true,        // Show - for commissioners
  showPlayersAcademy: true,    // Show - Players Academy
  // Token Economy - Enabled for game logging
  showTokenEconomy: false,     // Hide - token/wallet system (not ready)
  showLeagueHierarchy: false,  // Hide - Road to the Show
  showRewards: true,           // Show - badges/streaks/leaderboards for game logging
  showGameLogger: true,        // Show - game logging for all members
  // MLB The Show Integration - All enabled by default
  showPlayerDatabase: true,    // Show - Live Series database
  showMyTeam: true,            // Show - Roster builder
  showRosterUpdates: true,     // Show - Buff/Nerf tracking
  showExhibitionGames: true,   // Show - Exhibition/Sim games (beta)
  // Off-Season Program
  showOffSeason: true,         // Show - Off-season hub (enable during off-season)
};

/**
 * Get current feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') {
    return DEFAULT_FLAGS;
  }
  
  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load feature flags:', e);
  }
  
  return DEFAULT_FLAGS;
}

/**
 * Update feature flags (admin only)
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
  if (typeof window === 'undefined') return;
  
  const current = getFeatureFlags();
  const updated = { ...current, ...flags };
  localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(updated));
}

/**
 * Reset to default flags
 */
export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(DEFAULT_FLAGS));
}

/**
 * Check if a feature is enabled for a user
 * Admins always have access to everything
 */
export function isFeatureEnabled(
  featureKey: keyof FeatureFlags, 
  isAdmin: boolean = false
): boolean {
  // Admins see everything
  if (isAdmin) return true;
  
  const flags = getFeatureFlags();
  return flags[featureKey] ?? false;
}

// Feature display names for the admin UI
export const FEATURE_LABELS: Record<keyof FeatureFlags, { name: string; description: string; category: string }> = {
  showDashboard: {
    name: 'Full Dashboard',
    description: 'Complete franchise dashboard with stats, budget, matchups',
    category: 'Main Sections',
  },
  showTools: {
    name: 'League Tools',
    description: 'Access to all league management tools',
    category: 'Main Sections',
  },
  showDocuments: {
    name: 'Documents',
    description: 'League documents, rules, and forms',
    category: 'Main Sections',
  },
  showFreeAgents: {
    name: 'Free Agents',
    description: 'Browse and view free agent players',
    category: 'Main Sections',
  },
  showStandings: {
    name: 'Standings',
    description: 'League standings and rankings',
    category: 'Main Sections',
  },
  showAnnouncements: {
    name: 'Announcements Widget',
    description: 'League announcements on dashboard',
    category: 'Dashboard Widgets',
  },
  showComingSoon: {
    name: 'Coming Soon Widget',
    description: 'Preview of upcoming features',
    category: 'Dashboard Widgets',
  },
  showQuickLinks: {
    name: 'Quick Links',
    description: 'Documents and SMS signup cards',
    category: 'Dashboard Widgets',
  },
  showInjuredList: {
    name: 'IL Manager',
    description: 'Injured List tracking tool',
    category: 'Tools',
  },
  showGameRecap: {
    name: 'Game Recap Creator',
    description: 'AI-powered game recap generator',
    category: 'Tools',
  },
  showDraftBoard: {
    name: 'Draft Board',
    description: 'Draft tracking and management',
    category: 'Tools',
  },
  showPlayersAcademy: {
    name: 'Players Academy',
    description: 'Scouting hub, tutorials, and game analysis',
    category: 'Tools',
  },
  // Token Economy Features
  showTokenEconomy: {
    name: 'Token Economy',
    description: 'Wallet, salary payments, and token spending system',
    category: 'Token Economy',
  },
  showLeagueHierarchy: {
    name: 'Road to the Show',
    description: 'League tier progression system (Rookie → Majors)',
    category: 'Token Economy',
  },
  showRewards: {
    name: 'Rewards System',
    description: 'Badges, streaks, and leaderboards',
    category: 'Token Economy',
  },
  showGameLogger: {
    name: 'Game Logger',
    description: 'Manual game logging for stats and tokens',
    category: 'Token Economy',
  },
  // MLB The Show Integration
  showPlayerDatabase: {
    name: 'Player Database',
    description: 'Live Series player search, attributes, and comparisons',
    category: 'MLB The Show',
  },
  showMyTeam: {
    name: 'My Team',
    description: 'Custom league roster builder and management',
    category: 'MLB The Show',
  },
  showRosterUpdates: {
    name: 'Roster Updates',
    description: 'Live Series buff/nerf tracking and alerts',
    category: 'MLB The Show',
  },
  showExhibitionGames: {
    name: 'Exhibition Games',
    description: 'Simulated games against members or CPU',
    category: 'MLB The Show',
  },
  // Off-Season Program
  showOffSeason: {
    name: 'Off-Season Hub',
    description: 'Off-season questionnaire, free agents, claims, and playoff tracking',
    category: 'Off-Season',
  },
};


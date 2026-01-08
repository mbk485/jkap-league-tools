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
  
  // Individual tools
  showInjuredList: boolean;    // IL Manager tool
  showGameRecap: boolean;      // Game Recap Creator
  showDraftBoard: boolean;     // Draft Board tool
}

const FEATURE_FLAGS_KEY = 'jkap_feature_flags';

// Default flags - what members see by default
const DEFAULT_FLAGS: FeatureFlags = {
  showDashboard: false,        // Hide for now
  showTools: true,             // Show - main feature
  showDocuments: false,        // Hide for now
  showFreeAgents: false,       // Hide for now
  showStandings: false,        // Hide for now
  showInjuredList: true,       // Show - ready to use
  showGameRecap: true,         // Show - ready to use
  showDraftBoard: false,       // Hide for now
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
    name: 'The Ballyard',
    description: 'Owner Dashboard with team stats, inbox, and matchups',
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
};


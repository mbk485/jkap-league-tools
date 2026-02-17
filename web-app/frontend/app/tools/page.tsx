'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getFeatureFlags, FeatureFlags } from '@/lib/feature-flags';
import { getUserPerks, PerkId, AVAILABLE_PERKS } from '@/lib/supabase';
import {
  Clipboard,
  Users,
  TrendingUp,
  Calendar,
  Settings,
  Lock,
  ArrowRight,
  Sparkles,
  Shield,
  AlertTriangle,
  FileSpreadsheet,
  Newspaper,
  GraduationCap,
  Gamepad2,
  Coins,
  Search,
  Database,
  Bell,
  Swords,
  Trophy,
} from 'lucide-react';

interface LeagueTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status: 'available' | 'coming-soon' | 'beta';
  category: 'management' | 'draft' | 'analytics' | 'admin';
  isNew?: boolean;
  requiresAdmin?: boolean;
  featureFlag?: keyof FeatureFlags;
  // Control who sees this tool based on user type
  // 'jkap_member' = only JKAP league members
  // 'external_commissioner' = only external commissioners
  // undefined = everyone (based on feature flags)
  forUserType?: 'jkap_member' | 'external_commissioner';
  // Perk required to access this tool (from league level)
  // If user doesn't have perk, they can purchase access with tokens
  requiredPerk?: PerkId;
  // If true, this tool is free for everyone (regardless of perks)
  isFree?: boolean;
}

const leagueTools: LeagueTool[] = [
  // ===== FREE TOOLS (Available to ALL league levels) =====
  {
    id: 'game-logger',
    name: 'Game Logger',
    description: 'Log your games, track stats, earn tokens, and compete on the leaderboards for HRs, Ks, Wins & Saves.',
    icon: <Gamepad2 className="w-7 h-7" />,
    href: '/tools/game-logger',
    status: 'available',
    category: 'management',
    isNew: true,
    isFree: true, // Free for everyone
    featureFlag: 'showGameLogger',
  },
  {
    id: 'injured-list',
    name: 'Injured List Manager',
    description: 'Track IL placements, monitor compliance with league rules, and manage roster status across all teams.',
    icon: <AlertTriangle className="w-7 h-7" />,
    href: '/tools/injured-list',
    status: 'available',
    category: 'management',
    isFree: true, // Free for everyone
    featureFlag: 'showInjuredList',
  },
  // ===== FREE TOOLS FOR ALL MEMBERS =====
  {
    id: 'game-recap',
    name: 'Game Recap Creator',
    description: 'Generate ESPN-style game recaps with AI. Log games to earn recap credits!',
    icon: <Newspaper className="w-7 h-7" />,
    href: '/tools/game-recap',
    status: 'available',
    category: 'analytics',
    isNew: true,
    isFree: true, // Free for all members - uses recap credits system
    featureFlag: 'showGameRecap',
  },
  // ===== TIERED TOOLS (Require perks or token purchase) =====
  {
    id: 'players-academy',
    name: 'Players Academy',
    description: 'AI-powered scouting reports and gameplay analysis. Requires Double-A or higher, or purchase access.',
    icon: <GraduationCap className="w-7 h-7" />,
    href: '/tools/players-academy',
    status: 'available',
    category: 'analytics',
    isNew: true,
    requiredPerk: 'scouting_reports', // Double-A and above
    featureFlag: 'showPlayersAcademy',
  },
  // ===== MLB THE SHOW INTEGRATION TOOLS =====
  {
    id: 'player-database',
    name: 'Player Database',
    description: 'Search Live Series players, view attributes, compare cards, and research for drafts and trades.',
    icon: <Database className="w-7 h-7" />,
    href: '/tools/player-database',
    status: 'available',
    category: 'analytics',
    isNew: true,
    isFree: true,
    featureFlag: 'showPlayerDatabase',
  },
  {
    id: 'my-team',
    name: 'My Team',
    description: 'Build and manage your custom league roster. Track your lineup and get improvement suggestions.',
    icon: <Users className="w-7 h-7" />,
    href: '/tools/my-team',
    status: 'available',
    category: 'management',
    isNew: true,
    isFree: true,
    featureFlag: 'showMyTeam',
  },
  {
    id: 'roster-updates',
    name: 'Roster Updates',
    description: 'Track Live Series buff/nerf changes. Get alerts when your players get updated.',
    icon: <Bell className="w-7 h-7" />,
    href: '/tools/roster-updates',
    status: 'available',
    category: 'analytics',
    isNew: true,
    isFree: true,
    featureFlag: 'showRosterUpdates',
  },
  {
    id: 'exhibition-games',
    name: 'Exhibition Games',
    description: 'Play simulated games against other members or CPU. Practice without using league games.',
    icon: <Swords className="w-7 h-7" />,
    href: '/tools/exhibition',
    status: 'beta',
    category: 'management',
    isNew: true,
    isFree: true,
    featureFlag: 'showExhibitionGames',
  },
  // ===== COMING SOON =====
  {
    id: 'roster-advice',
    name: 'Roster Advice',
    description: 'AI-powered roster recommendations and lineup optimization. Available at Triple-A and above.',
    icon: <Trophy className="w-7 h-7" />,
    href: '/tools/roster-advice',
    status: 'coming-soon',
    category: 'analytics',
    requiredPerk: 'roster_advice', // Triple-A and above
  },
  {
    id: 'standings-tracker',
    name: 'Standings Tracker',
    description: 'Live standings, playoff scenarios, and statistical breakdowns by division.',
    icon: <TrendingUp className="w-7 h-7" />,
    href: '/tools/standings',
    status: 'coming-soon',
    category: 'analytics',
    isFree: true,
  },
  {
    id: 'schedule-builder',
    name: 'Schedule Builder',
    description: 'Generate balanced schedules, manage matchups, and handle postponements.',
    icon: <Calendar className="w-7 h-7" />,
    href: '/tools/schedule',
    status: 'coming-soon',
    category: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'trade-analyzer',
    name: 'Trade Analyzer',
    description: 'Evaluate trades with player value comparisons and historical trade data.',
    icon: <FileSpreadsheet className="w-7 h-7" />,
    href: '/tools/trade-analyzer',
    status: 'coming-soon',
    category: 'analytics',
    isFree: true,
  },
  {
    id: 'league-settings',
    name: 'League Settings',
    description: 'Configure league rules, scoring, roster limits, and administrative settings.',
    icon: <Settings className="w-7 h-7" />,
    href: '/tools/settings',
    status: 'coming-soon',
    category: 'admin',
    requiresAdmin: true,
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  management: { label: 'Team Management', color: 'text-emerald-400' },
  draft: { label: 'Draft Tools', color: 'text-amber-400' },
  analytics: { label: 'Analytics', color: 'text-blue-400' },
  admin: { label: 'Administration', color: 'text-purple-400' },
};

export default function LeagueToolsPage() {
  const { isAuthenticated, user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [featureFlags, setFeatureFlagsState] = useState<FeatureFlags | null>(null);
  const [userPerks, setUserPerks] = useState<string[]>([]);

  useEffect(() => {
    setIsLoaded(true);
    // Load feature flags
    setFeatureFlagsState(getFeatureFlags());
    
    // Load user perks
    if (user?.id) {
      getUserPerks(user.id).then(perks => setUserPerks(perks));
    }
    
    // Poll for changes (in case admin updates flags)
    const interval = setInterval(() => {
      setFeatureFlagsState(getFeatureFlags());
    }, 2000);
    
    return () => clearInterval(interval);
  }, [user?.id]);
  
  // Check if user has access to a tool
  const hasToolAccess = (tool: LeagueTool): boolean => {
    // Free tools are always accessible
    if (tool.isFree) return true;
    // Admins have access to everything
    if (user?.isAdmin) return true;
    // Check if user has required perk
    if (tool.requiredPerk) {
      return userPerks.includes(tool.requiredPerk);
    }
    return true;
  };

  // Filter tools based on category, admin status, user type, AND feature flags
  const filteredTools = leagueTools.filter((tool) => {
    // Category filter
    if (filter !== 'all' && tool.category !== filter) return false;
    
    // Admin-only tools require admin status
    if (tool.requiresAdmin && !user?.isAdmin) return false;
    
    // Admins see everything
    if (user?.isAdmin) return true;
    
    // Check user type restriction
    // If tool is for a specific user type, only show to that type
    if (tool.forUserType) {
      if (tool.forUserType !== user?.userType) return false;
    }
    
    // Check feature flag if specified
    if (tool.featureFlag && featureFlags) {
      if (!featureFlags[tool.featureFlag]) return false;
    }
    
    return true;
  });

  const categories = ['all', 'management', 'draft', 'analytics', 'admin'];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-jkap-red-500/10 border border-jkap-red-500/30 mb-6">
              <Lock className="w-10 h-10 text-jkap-red-500" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4">
              LEAGUE TOOLS
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Access to League Tools requires authentication. Sign in with your JKAP Memorial League credentials.
            </p>
            <Button
              as="link"
              href="/login"
              variant="primary"
              size="lg"
              icon={<Lock className="w-5 h-5" />}
            >
              Sign In to Access
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-jkap-navy-900/30 via-transparent to-background" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div
              className={`transition-all duration-700 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <Badge variant="outline" className="border-jkap-red-500/50 text-jkap-red-400">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Commissioner Tools
                </Badge>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl text-foreground mb-4">
                LEAGUE TOOLS
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Your command center for managing the JKAP Memorial League. Draft players, 
                track injuries, analyze trades, and keep your franchise running smoothly.
              </p>

              {user && (
                <p className="text-sm text-muted-foreground/70 mt-4">
                  Signed in as <span className="text-foreground font-medium">{user.displayName}</span>
                  {user.isAdmin && (
                    <Badge variant="delinquent" className="ml-2 text-xs">Admin</Badge>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === cat
                      ? 'bg-jkap-red-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {cat === 'all' ? 'All Tools' : categoryLabels[cat]?.label || cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {filteredTools.map((tool, index) => {
                const isComingSoon = tool.status === 'coming-soon';
                const isAdminOnly = tool.requiresAdmin && !user?.isAdmin;
                const hasPerkAccess = hasToolAccess(tool);
                const isLocked = !hasPerkAccess && !isComingSoon;
                const isDisabled = isComingSoon || isAdminOnly;
                const categoryInfo = categoryLabels[tool.category];
                const perkInfo = tool.requiredPerk ? AVAILABLE_PERKS[tool.requiredPerk] : null;

                return (
                  <div 
                    key={tool.id}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                  <Card
                    className={`group relative overflow-hidden transition-all duration-300 h-full ${
                      isDisabled || isLocked ? 'opacity-75' : 'hover:border-jkap-red-500/50'
                    } ${isLocked ? 'border-amber-500/30' : ''}`}
                  >
                    {/* Locked overlay for perk-gated tools */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent z-10 pointer-events-none" />
                    )}
                    
                    {/* Glow effect on hover */}
                    {!isDisabled && !isLocked && (
                      <div className="absolute inset-0 bg-gradient-to-br from-jkap-red-500/0 to-jkap-red-500/0 group-hover:from-jkap-red-500/5 group-hover:to-transparent transition-all duration-300" />
                    )}

                    <div className="relative p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                          isDisabled 
                            ? 'bg-muted text-muted-foreground' 
                            : isLocked
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-jkap-red-500/10 text-jkap-red-500'
                        }`}>
                          {isLocked ? <Lock className="w-7 h-7" /> : tool.icon}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {tool.isFree && (
                            <Badge variant="active" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Free</Badge>
                          )}
                          {tool.isNew && !isLocked && (
                            <Badge variant="active" className="text-xs">New</Badge>
                          )}
                          {isLocked && perkInfo && (
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                              <Coins className="w-3 h-3 mr-1" />
                              {perkInfo.tokenCost}
                            </Badge>
                          )}
                          {tool.status === 'coming-soon' && (
                            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                          )}
                          {tool.status === 'beta' && (
                            <Badge variant="delinquent" className="text-xs">Beta</Badge>
                          )}
                          {tool.requiresAdmin && (
                            <Badge variant="system" className="text-xs">Admin</Badge>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="mb-4">
                        <span className={`text-xs font-medium uppercase tracking-wider ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        <h3 className="text-xl font-semibold text-foreground mt-1 mb-2">
                          {tool.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tool.description}
                        </p>
                      </div>

                      {/* Action */}
                      {isDisabled ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lock className="w-4 h-4" />
                          {tool.requiresAdmin && !user?.isAdmin 
                            ? 'Admin Access Required' 
                            : 'In Development'}
                        </div>
                      ) : isLocked ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-amber-400">
                            <Lock className="w-4 h-4" />
                            Requires {perkInfo?.name || 'Higher League Level'}
                          </div>
                          <Link
                            href="/league-levels"
                            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-amber-400 transition-colors"
                          >
                            View Road to the Show
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={tool.href}
                          className="inline-flex items-center gap-2 text-sm font-medium text-jkap-red-500 hover:text-jkap-red-400 transition-colors"
                        >
                          Launch Tool
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      )}
                    </div>
                  </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quick Stats / Info Banner */}
        <section className="py-12 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card p-8 text-center">
              <h2 className="font-display text-2xl text-foreground mb-2">
                MORE TOOLS COMING SOON
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                We're constantly building new tools to make managing your franchise easier. 
                Have a suggestion? Let us know!
              </p>
              <Button variant="outline" size="sm">
                Request a Feature
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


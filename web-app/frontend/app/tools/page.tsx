'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
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
}

const leagueTools: LeagueTool[] = [
  {
    id: 'draft-board',
    name: 'Draft Board',
    description: 'Run snake drafts with timer, player pool, and real-time tracking. Upload your player CSV and go.',
    icon: <Clipboard className="w-7 h-7" />,
    href: '/draft',
    status: 'available',
    category: 'draft',
  },
  {
    id: 'injured-list',
    name: 'Injured List Manager',
    description: 'Track IL placements, monitor compliance with league rules, and manage roster status across all teams.',
    icon: <AlertTriangle className="w-7 h-7" />,
    href: '/tools/injured-list',
    status: 'available',
    category: 'management',
    isNew: true,
  },
  {
    id: 'roster-manager',
    name: 'Roster Manager',
    description: 'Full roster management with position tracking, player cards, and transaction history.',
    icon: <Users className="w-7 h-7" />,
    href: '/tools/roster',
    status: 'coming-soon',
    category: 'management',
  },
  {
    id: 'standings-tracker',
    name: 'Standings Tracker',
    description: 'Live standings, playoff scenarios, and statistical breakdowns by division.',
    icon: <TrendingUp className="w-7 h-7" />,
    href: '/tools/standings',
    status: 'coming-soon',
    category: 'analytics',
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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredTools = leagueTools.filter((tool) => {
    if (filter === 'all') return true;
    return tool.category === filter;
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
                const isDisabled = tool.status === 'coming-soon' || 
                  (tool.requiresAdmin && !user?.isAdmin);
                const categoryInfo = categoryLabels[tool.category];

                return (
                  <Card
                    key={tool.id}
                    className={`group relative overflow-hidden transition-all duration-300 ${
                      isDisabled ? 'opacity-60' : 'hover:border-jkap-red-500/50'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Glow effect on hover */}
                    {!isDisabled && (
                      <div className="absolute inset-0 bg-gradient-to-br from-jkap-red-500/0 to-jkap-red-500/0 group-hover:from-jkap-red-500/5 group-hover:to-transparent transition-all duration-300" />
                    )}

                    <div className="relative p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                          isDisabled 
                            ? 'bg-muted text-muted-foreground' 
                            : 'bg-jkap-red-500/10 text-jkap-red-500'
                        }`}>
                          {tool.icon}
                        </div>
                        <div className="flex items-center gap-2">
                          {tool.isNew && (
                            <Badge variant="active" className="text-xs">New</Badge>
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


'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KNOWLEDGE_BASE, LeagueRule, LEAGUE_INFO } from '@/lib/league-knowledge-base';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  Trophy,
  Calendar,
  ArrowLeftRight,
  Heart,
  Gamepad2,
  Users,
  Shield,
  Wrench,
  MessageSquare,
  AlertTriangle,
  Filter,
} from 'lucide-react';

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; description: string }> = {
  General: { 
    icon: <Trophy className="w-5 h-5" />, 
    color: 'text-amber-400',
    description: 'About the league and how to get help'
  },
  Activity: { 
    icon: <Calendar className="w-5 h-5" />, 
    color: 'text-blue-400',
    description: 'Game requirements and scheduling'
  },
  Trading: { 
    icon: <ArrowLeftRight className="w-5 h-5" />, 
    color: 'text-purple-400',
    description: 'Trading rules and approval process'
  },
  'Injured List': { 
    icon: <Heart className="w-5 h-5" />, 
    color: 'text-red-400',
    description: 'IL placement and activation rules'
  },
  Gameplay: { 
    icon: <Gamepad2 className="w-5 h-5" />, 
    color: 'text-green-400',
    description: 'In-game rules and sportsmanship'
  },
  Offseason: { 
    icon: <Calendar className="w-5 h-5" />, 
    color: 'text-orange-400',
    description: 'Draft and offseason activities'
  },
  Tools: { 
    icon: <Wrench className="w-5 h-5" />, 
    color: 'text-indigo-400',
    description: 'Available league tools and features'
  },
  Community: { 
    icon: <MessageSquare className="w-5 h-5" />, 
    color: 'text-pink-400',
    description: 'Discord, Facebook, and communication'
  },
  Penalties: { 
    icon: <AlertTriangle className="w-5 h-5" />, 
    color: 'text-yellow-400',
    description: 'Warnings, removals, and appeals'
  },
};

export default function RulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // Get unique categories
  const categories = Array.from(new Set(KNOWLEDGE_BASE.map(r => r.category)));

  // Filter rules based on search and category
  const filteredRules = KNOWLEDGE_BASE.filter(rule => {
    const matchesSearch = searchQuery === '' || 
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || rule.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group filtered rules by category
  const groupedRules = filteredRules.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, LeagueRule[]>);

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRules(new Set(filteredRules.map(r => r.title)));
  };

  const collapseAll = () => {
    setExpandedRules(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-4xl text-foreground">LEAGUE RULES</h1>
              <p className="text-muted-foreground">
                Complete rulebook for {LEAGUE_INFO.name}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules... (e.g., trading, IL, activity)"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {categories.map(cat => {
              const config = categoryConfig[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                    cat === selectedCategory
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className={config?.color}>{config?.icon}</span>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Official Rules Link */}
        <div className="mb-8">
          <a
            href="https://docs.google.com/document/d/15RBBVmytH1vKihitcrzv9Ymtu9IAPN-b_92Ewxtg-WA/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl hover:border-amber-500 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-amber-400" />
                <div>
                  <p className="font-bold text-white group-hover:text-amber-400 transition-colors">
                    Official League Rules Document
                  </p>
                  <p className="text-sm text-slate-400">
                    View the complete official rulebook on Google Docs
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400" />
            </div>
          </a>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-3xl font-bold text-amber-400">{KNOWLEDGE_BASE.length}</p>
            <p className="text-sm text-slate-400">Total Rules</p>
          </div>
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-3xl font-bold text-blue-400">{categories.length}</p>
            <p className="text-sm text-slate-400">Categories</p>
          </div>
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-3xl font-bold text-green-400">5</p>
            <p className="text-sm text-slate-400">Games/Week Min</p>
          </div>
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-3xl font-bold text-purple-400">15</p>
            <p className="text-sm text-slate-400">Games Between Trades</p>
          </div>
        </div>

        {/* Expand/Collapse Controls */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            Showing {filteredRules.length} of {KNOWLEDGE_BASE.length} rules
          </p>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-amber-400 hover:underline"
            >
              Expand All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-slate-400 hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Rules by Category */}
        <div className="space-y-6">
          {Object.entries(groupedRules).map(([category, rules]) => {
            const config = categoryConfig[category];
            return (
              <Card key={category} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center ${config?.color}`}>
                      {config?.icon}
                    </div>
                    <div>
                      <CardTitle className="text-white">{category}</CardTitle>
                      <p className="text-sm text-slate-400">{config?.description}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {rules.length} rules
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {rules.map((rule) => {
                      const isExpanded = expandedRules.has(rule.title);
                      return (
                        <div
                          key={rule.title}
                          className="border border-slate-700 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => toggleRule(rule.title)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
                          >
                            <span className="font-medium text-white">{rule.title}</span>
                            {isExpanded 
                              ? <ChevronDown className="w-5 h-5 text-slate-400" />
                              : <ChevronRight className="w-5 h-5 text-slate-400" />
                            }
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-700 pt-3">
                              <p className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">
                                {rule.content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Results */}
        {filteredRules.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No rules found</h3>
            <p className="text-slate-400">
              Try a different search term or clear your filters.
            </p>
          </Card>
        )}

        {/* Help Footer */}
        <Card className="mt-12 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Have a question?</h3>
                <p className="text-slate-300 text-sm">
                  Use the League Assistant (chat bubble in bottom right) to ask questions about any rule, 
                  or contact the commissioner directly on Discord for clarification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

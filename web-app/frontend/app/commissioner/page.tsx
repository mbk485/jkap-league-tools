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
  Newspaper,
  GraduationCap,
  Zap,
  Crown,
  Check,
  Star,
  Rocket,
} from 'lucide-react';

interface CommissionerTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  tier: 'free' | 'premium';
  category: 'draft' | 'management' | 'analytics' | 'ai-powered';
  features: string[];
  isPopular?: boolean;
  comingSoon?: boolean;
}

const commissionerTools: CommissionerTool[] = [
  // FREE TOOLS
  {
    id: 'draft-board',
    name: 'Draft Board',
    description: 'Run snake drafts with timer, player pool, and real-time tracking. Perfect for any fantasy league draft.',
    icon: <Clipboard className="w-8 h-8" />,
    href: '/draft',
    tier: 'free',
    category: 'draft',
    features: [
      'Snake draft support',
      'Built-in pick timer',
      'CSV player import',
      'Real-time tracking',
      'Mobile friendly',
    ],
    isPopular: true,
  },
  {
    id: 'basic-recap',
    name: 'Game Recap (Basic)',
    description: 'Create simple game recaps with manual entry. Great for posting to your league channels.',
    icon: <Newspaper className="w-8 h-8" />,
    href: '/tools/game-recap',
    tier: 'free',
    category: 'management',
    features: [
      'Manual game entry',
      'Copy to clipboard',
      'Basic formatting',
      'Multiple styles',
    ],
  },

  // PREMIUM TOOLS (AI-Powered)
  {
    id: 'smart-recap',
    name: 'Smart Recap Creator',
    description: 'AI-powered game recaps. Upload a screenshot and get ESPN-quality recaps instantly generated.',
    icon: <Sparkles className="w-8 h-8" />,
    href: '/tools/game-recap',
    tier: 'premium',
    category: 'ai-powered',
    features: [
      'Screenshot upload & AI analysis',
      'ESPN-style writing',
      'Auto-extract game data',
      'Multiple recap styles',
      'Social media ready',
    ],
    isPopular: true,
  },
  {
    id: 'players-academy',
    name: 'Players Academy',
    description: 'AI coaching for your league members. Upload game analysis and get personalized feedback to improve gameplay.',
    icon: <GraduationCap className="w-8 h-8" />,
    href: '/tools/players-academy',
    tier: 'premium',
    category: 'ai-powered',
    features: [
      'AI gameplay analysis',
      'Personalized coaching tips',
      'Pitch analysis breakdown',
      'Opponent scouting reports',
      'Improvement tracking',
    ],
  },
  {
    id: 'il-manager-pro',
    name: 'IL Manager Pro',
    description: 'Full injured list management with custom rules, Discord integration, and league-wide compliance tracking.',
    icon: <AlertTriangle className="w-8 h-8" />,
    href: '/tools/injured-list',
    tier: 'premium',
    category: 'management',
    features: [
      'Custom IL rules',
      'Discord auto-posting',
      'ESPN-style announcements',
      'Compliance tracking',
      'League-wide dashboard',
    ],
  },
  {
    id: 'league-intel',
    name: 'League Intel Center',
    description: 'Behind-the-scenes scouting data aggregation. See what your league members struggle with and excel at.',
    icon: <Shield className="w-8 h-8" />,
    href: '/admin',
    tier: 'premium',
    category: 'ai-powered',
    features: [
      'Aggregated scouting data',
      'Team weakness reports',
      'Pitch tendency analysis',
      'Commissioner-only access',
      'Data-driven insights',
    ],
    comingSoon: true,
  },
  {
    id: 'trade-analyzer',
    name: 'Trade Analyzer',
    description: 'AI-powered trade evaluation. Get instant analysis on whether a trade is fair for your league.',
    icon: <FileSpreadsheet className="w-8 h-8" />,
    href: '/tools/trade-analyzer',
    tier: 'premium',
    category: 'ai-powered',
    features: [
      'AI trade evaluation',
      'Player value comparison',
      'Historical trade data',
      'Fairness scoring',
    ],
    comingSoon: true,
  },
];

const tierColors = {
  free: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  premium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft Tools', icon: <Clipboard className="w-4 h-4" /> },
  management: { label: 'League Management', icon: <Users className="w-4 h-4" /> },
  analytics: { label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
  'ai-powered': { label: 'AI-Powered', icon: <Sparkles className="w-4 h-4" /> },
};

export default function CommissionerHubPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredTools = commissionerTools.filter((tool) => {
    if (filter === 'all') return true;
    if (filter === 'free') return tool.tier === 'free';
    if (filter === 'premium') return tool.tier === 'premium';
    return tool.category === filter;
  });

  const freeTools = commissionerTools.filter(t => t.tier === 'free');
  const premiumTools = commissionerTools.filter(t => t.tier === 'premium');

  // Check if user has premium (for now, just check if admin - later this would be subscription status)
  const hasPremium = user?.isAdmin || false;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div
          className={`text-center mb-12 transition-all duration-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-jkap-red-500/20 border border-amber-500/30 mb-6">
            <Rocket className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Commissioner Tools</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display text-foreground tracking-wide mb-4">
            Power Your League
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional-grade tools to run your fantasy league like a pro. 
            Free tools to get started, premium AI features when you're ready.
          </p>
        </div>

        {/* Stats Bar */}
        <div
          className={`grid grid-cols-3 gap-4 mb-8 transition-all duration-500 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Card className="p-4 text-center bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <p className="text-3xl font-bold text-emerald-400">{freeTools.length}</p>
            <p className="text-sm text-muted-foreground">Free Tools</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <p className="text-3xl font-bold text-amber-400">{premiumTools.length}</p>
            <p className="text-sm text-muted-foreground">Premium Tools</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-jkap-red-500/10 to-transparent border-jkap-red-500/20">
            <p className="text-3xl font-bold text-jkap-red-500">AI</p>
            <p className="text-sm text-muted-foreground">Powered Features</p>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div
          className={`flex flex-wrap gap-2 mb-8 transition-all duration-500 delay-150 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {['all', 'free', 'premium', 'ai-powered', 'draft', 'management'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-jkap-red-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' && 'All Tools'}
              {f === 'free' && '🆓 Free'}
              {f === 'premium' && '👑 Premium'}
              {f === 'ai-powered' && '✨ AI-Powered'}
              {f === 'draft' && 'Draft'}
              {f === 'management' && 'Management'}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool, index) => {
            const isLocked = tool.tier === 'premium' && !hasPremium;
            
            return (
              <div
                key={tool.id}
                className={`transition-all duration-500 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${200 + index * 50}ms` }}
              >
                <Card
                  className={`h-full flex flex-col relative overflow-hidden ${
                    isLocked ? 'opacity-90' : ''
                  } ${tool.isPopular ? 'ring-2 ring-amber-500/50' : ''}`}
                >
                  {/* Popular Badge */}
                  {tool.isPopular && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                      <Star className="w-3 h-3 inline mr-1" />
                      POPULAR
                    </div>
                  )}

                  {/* Coming Soon Overlay */}
                  {tool.comingSoon && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center">
                        <Rocket className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-lg font-bold text-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground">Stay tuned!</p>
                      </div>
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 rounded-xl ${
                          tool.tier === 'premium'
                            ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400'
                            : 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-400'
                        }`}
                      >
                        {tool.icon}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${tierColors[tool.tier]}`}
                      >
                        {tool.tier === 'free' ? '🆓 FREE' : '👑 PREMIUM'}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xl font-bold text-foreground mb-2">{tool.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4 flex-1">{tool.description}</p>

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      {tool.features.slice(0, 4).map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                      {tool.features.length > 4 && (
                        <p className="text-xs text-muted-foreground pl-6">
                          +{tool.features.length - 4} more features
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    {isLocked ? (
                      <Button variant="secondary" fullWidth disabled className="relative">
                        <Lock className="w-4 h-4 mr-2" />
                        Subscribe to Unlock
                      </Button>
                    ) : tool.comingSoon ? (
                      <Button variant="secondary" fullWidth disabled>
                        Coming Soon
                      </Button>
                    ) : (
                      <Link href={tool.href}>
                        <Button
                          variant={tool.tier === 'premium' ? 'primary' : 'secondary'}
                          fullWidth
                        >
                          {tool.tier === 'free' ? 'Use Free' : 'Launch Tool'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Premium CTA Section */}
        {!hasPremium && (
          <div
            className={`mt-16 transition-all duration-500 delay-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Card className="p-8 bg-gradient-to-br from-amber-500/10 via-jkap-red-500/10 to-purple-500/10 border-amber-500/30">
              <div className="text-center max-w-2xl mx-auto">
                <Crown className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Unlock Premium Tools
                </h2>
                <p className="text-muted-foreground mb-6">
                  Get access to AI-powered features, advanced analytics, and commissioner-exclusive tools. 
                  Take your league to the next level.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="primary" size="lg">
                    <Zap className="w-5 h-5 mr-2" />
                    View Plans & Pricing
                  </Button>
                  <Button variant="secondary" size="lg">
                    Contact Us
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Starting at $5/month • Cancel anytime
                </p>
              </div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLeagues,
  getUserLeagueProfile,
  DBLeague,
  DBUserLevel,
  DBUserWallet,
} from '@/lib/supabase';
import {
  Crown,
  Trophy,
  Star,
  Zap,
  User,
  ChevronRight,
  Coins,
  TrendingUp,
  Lock,
  Check,
  Clock,
  Target,
  Award,
  ArrowUp,
  Sparkles,
  Shield,
} from 'lucide-react';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  crown: <Crown className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  user: <User className="w-6 h-6" />,
};

// Perk display names
const perkNames: Record<string, string> = {
  smart_recap: 'Smart Recap (AI)',
  scouting_reports: 'Scouting Reports',
  roster_advice: 'Roster Advice (AI)',
  priority_support: 'Priority Support',
  custom_graphics: 'Custom Graphics',
  league_intel: 'League Intel Center',
};

export default function LeagueLevelsPage() {
  const { user, isAuthenticated } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [leagues, setLeagues] = useState<DBLeague[]>([]);
  const [userLevel, setUserLevel] = useState<DBUserLevel | null>(null);
  const [userLeague, setUserLeague] = useState<DBLeague | null>(null);
  const [wallet, setWallet] = useState<DBUserWallet | null>(null);
  const [qualification, setQualification] = useState<{
    percent: number;
    isQualified: boolean;
    requirements: {
      games: { current: number; required: number; met: boolean };
      winRate: { current: number; required: number; met: boolean };
      days: { current: number; required: number; met: boolean };
    };
    nextLeague: DBLeague | null;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    const allLeagues = await getLeagues();
    setLeagues(allLeagues);

    if (user?.id) {
      const profile = await getUserLeagueProfile(user.id);
      setUserLevel(profile.level);
      setUserLeague(profile.league);
      setWallet(profile.wallet);
      setQualification(profile.qualification);
    }

    setIsLoaded(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="font-display text-4xl text-foreground mb-4">ROAD TO THE SHOW</h1>
          <p className="text-muted-foreground mb-8">Sign in to view your league level and progress.</p>
          <Button as="link" href="/login" variant="primary">Sign In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-foreground">ROAD TO THE SHOW</h1>
              <p className="text-muted-foreground">Work your way up through the ranks</p>
            </div>
          </div>
        </div>

        {/* Your Current Status */}
        {userLeague && (
          <div 
            className={`p-6 mb-8 rounded-xl border transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ borderColor: userLeague.color + '40', background: `linear-gradient(135deg, ${userLeague.color}10, transparent)` }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Current Level */}
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: userLeague.color + '20', color: userLeague.color }}
                >
                  {iconMap[userLeague.icon] || <Trophy className="w-8 h-8" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Current Level</p>
                  <h2 className="text-2xl font-bold text-foreground">{userLeague.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-amber-400 font-medium">
                      {userLeague.monthly_salary} tokens/month
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="text-center px-4">
                  <p className="text-2xl font-bold text-foreground">{userLevel?.games_at_current_level || 0}</p>
                  <p className="text-xs text-muted-foreground">Games</p>
                </div>
                <div className="text-center px-4 border-l border-border">
                  <p className="text-2xl font-bold text-foreground">{userLevel?.wins_at_current_level || 0}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
                <div className="text-center px-4 border-l border-border">
                  <p className="text-2xl font-bold text-foreground">{userLevel?.days_in_league || 0}</p>
                  <p className="text-xs text-muted-foreground">Days</p>
                </div>
                <div className="text-center px-4 border-l border-border">
                  <p className="text-2xl font-bold text-amber-400">{wallet?.token_balance || 0}</p>
                  <p className="text-xs text-muted-foreground">Tokens</p>
                </div>
              </div>
            </div>

            {/* Promotion Progress */}
            {qualification?.nextLeague && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-foreground">
                      Path to {qualification.nextLeague.name}
                    </span>
                  </div>
                  <Badge 
                    variant={qualification.isQualified ? 'active' : 'outline'}
                    className={qualification.isQualified ? '' : 'opacity-60'}
                  >
                    {qualification.isQualified ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Qualified!
                      </>
                    ) : (
                      `${qualification.percent}% Complete`
                    )}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${qualification.percent}%`,
                      background: qualification.isQualified 
                        ? 'linear-gradient(90deg, #22c55e, #10b981)' 
                        : `linear-gradient(90deg, ${qualification.nextLeague.color}, ${qualification.nextLeague.color}80)`
                    }}
                  />
                </div>

                {/* Requirements */}
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-3 rounded-lg ${qualification.requirements.games.met ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {qualification.requirements.games.met ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Target className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground">Games Played</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {qualification.requirements.games.current} / {qualification.requirements.games.required}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg ${qualification.requirements.winRate.met ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {qualification.requirements.winRate.met ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground">Win Rate</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {qualification.requirements.winRate.current}% / {qualification.requirements.winRate.required}%
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg ${qualification.requirements.days.met ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {qualification.requirements.days.met ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground">Time in League</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {qualification.requirements.days.current} / {qualification.requirements.days.required} days
                    </p>
                  </div>
                </div>

                {qualification.isQualified && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        You're qualified for promotion! The commissioner will review and promote you soon.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* League Tiers */}
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-jkap-red-500" />
          League Tiers
        </h2>

        <div className={`space-y-4 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {leagues.map((league, index) => {
            const isCurrentLevel = userLeague?.id === league.id;
            const isAboveUser = userLeague ? league.level < userLeague.level : false;
            const isBelowUser = userLeague ? league.level > userLeague.level : true;

            return (
              <div 
                key={league.id}
                className={`p-5 rounded-xl border border-border bg-card transition-all ${
                  isCurrentLevel 
                    ? 'ring-2 ring-offset-2 ring-offset-background' 
                    : isAboveUser 
                    ? 'opacity-80' 
                    : ''
                }`}
                style={{ 
                  borderColor: isCurrentLevel ? league.color : undefined,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Level Icon */}
                  <div 
                    className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isAboveUser ? 'opacity-50' : ''
                    }`}
                    style={{ backgroundColor: league.color + '20', color: league.color }}
                  >
                    {iconMap[league.icon] || <Trophy className="w-7 h-7" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground">{league.name}</h3>
                      {isCurrentLevel && (
                        <Badge variant="active" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Your Level
                        </Badge>
                      )}
                      {isAboveUser && (
                        <Badge variant="outline" className="text-xs opacity-60">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{league.description}</p>

                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5" style={{ color: league.color }}>
                        <Coins className="w-4 h-4" />
                        <span className="font-medium">{league.monthly_salary} tokens/month</span>
                      </div>
                      
                      {league.manager_name && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Managed by {league.manager_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Perks */}
                    {league.perks.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {league.perks.map((perk) => (
                          <span 
                            key={perk} 
                            className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${isAboveUser ? 'opacity-50' : ''}`}
                            style={{ borderColor: league.color + '40', color: league.color }}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {perkNames[perk] || perk}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Requirements (for levels above user) */}
                    {isAboveUser && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <span className="font-medium">Requirements:</span> {league.min_games_to_qualify} games, 
                        {Math.round(league.min_win_rate * 100)}% win rate, 
                        {league.min_time_in_league_days} days
                      </div>
                    )}
                  </div>

                  {/* Level Number */}
                  <div className="text-right flex-shrink-0">
                    <div 
                      className="text-3xl font-bold"
                      style={{ color: league.color + '60' }}
                    >
                      L{6 - league.level}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Token Economy Info */}
        <Card className={`p-6 mt-8 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Token Economy
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Earning Tokens */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Earn Tokens
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between text-muted-foreground">
                  <span>Monthly Salary</span>
                  <span className="text-emerald-400">+50 to +500</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Log a Game</span>
                  <span className="text-emerald-400">+5</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Win Bonus</span>
                  <span className="text-emerald-400">+10</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Per Home Run</span>
                  <span className="text-emerald-400">+2</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>3+ Win Streak</span>
                  <span className="text-emerald-400">+15</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Promotion Bonus</span>
                  <span className="text-emerald-400">+100</span>
                </li>
              </ul>
            </div>

            {/* Spending Tokens */}
            <div>
              <h4 className="text-sm font-semibold text-jkap-red-400 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Spend Tokens
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between text-muted-foreground">
                  <span>Smart Recap (AI)</span>
                  <span className="text-jkap-red-400">25 tokens</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Scouting Report</span>
                  <span className="text-jkap-red-400">50 tokens</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Roster Advice</span>
                  <span className="text-jkap-red-400">75 tokens</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Priority Support</span>
                  <span className="text-jkap-red-400">100 tokens</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

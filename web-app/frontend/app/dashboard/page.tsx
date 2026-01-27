'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, NotificationBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getFeatureFlags, FeatureFlags } from '@/lib/feature-flags';
import { needsOnboarding } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Notification,
  mockNotifications,
  offSeasonItems,
  leagueDocuments,
} from '@/types/league';
import { MEMBERS_SMS_SIGNUP_URL } from '@/config/external-urls';
import {
  getPlayerRewards,
  getUserWallet,
  DBPlayerRewards,
  DBUserWallet,
} from '@/lib/supabase';
import {
  Trophy,
  BarChart3,
  ChevronRight,
  Calendar,
  Bell,
  TrendingUp,
  Clock,
  FileText,
  Sparkles,
  ExternalLink,
  Smartphone,
  MessageSquare,
  ArrowLeftRight,
  Users,
  Zap,
  Award,
  Flame,
  Coins,
  Medal,
  Target,
  Star,
} from 'lucide-react';

// Format relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isLoaded, setIsLoaded] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [rewards, setRewards] = useState<DBPlayerRewards | null>(null);
  const [wallet, setWallet] = useState<DBUserWallet | null>(null);

  useEffect(() => {
    // Check if user needs onboarding
    const checkOnboarding = async () => {
      if (user?.id && user.userType === 'jkap_member' && !user.isAdmin) {
        console.log('Dashboard: Checking onboarding for user:', user.id, 'userType:', user.userType);
        const needs = await needsOnboarding(user.id);
        console.log('Dashboard: needsOnboarding result:', needs);
        if (needs) {
          console.log('Dashboard: Redirecting to /welcome');
          router.push('/welcome');
          return;
        }
        console.log('Dashboard: User does not need onboarding, showing dashboard');
      } else {
        console.log('Dashboard: Skipping onboarding check - user:', user?.id, 'userType:', user?.userType, 'isAdmin:', user?.isAdmin);
      }
      // Load feature flags
      setFeatureFlags(getFeatureFlags());
      // Load rewards data
      if (user?.id) {
        const [rewardsData, walletData] = await Promise.all([
          getPlayerRewards(user.id),
          getUserWallet(user.id),
        ]);
        setRewards(rewardsData);
        setWallet(walletData);
      }
      // Simulate data loading animation
      setIsLoaded(true);
    };
    
    checkOnboarding();
  }, [user, router]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Use actual user team data, not mock data
  const userTeamName = user?.teamName || 'Your Team';
  const userTeamAbbr = user?.teamAbbreviation || 'TM';
  const userName = user?.displayName || 'Manager';
  
  // Check if user is admin (admins see everything)
  const isAdmin = user?.isAdmin || false;
  
  // Feature visibility helpers
  const showQuickLinks = isAdmin || featureFlags?.showQuickLinks;
  const showAnnouncements = isAdmin || featureFlags?.showAnnouncements;
  const showComingSoon = isAdmin || featureFlags?.showComingSoon;
  const showRewardsWidget = isAdmin || featureFlags?.showRewards;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div
          className={`mb-8 transition-all duration-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center shadow-glow-red">
                  <span className="font-display text-white text-lg">{userTeamAbbr}</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display text-foreground tracking-wide">
                    {getGreeting()}, {userName.split(' ')[0]}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <span>{userTeamName}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-sm">JKAP Memorial League</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                as="link"
                href="/tools"
                variant="primary" 
                size="sm" 
                icon={<Sparkles className="w-4 h-4" />}
              >
                League Tools
              </Button>
            </div>
          </div>
        </div>

        {/* Primary Action Cards - Game Logger & Tools */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 transition-all duration-500 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Game Logger - Log Your Games */}
          <Link href="/tools/game-logger">
            <Card variant="metric" accentColor="success" className="p-6 h-full cursor-pointer hover:border-emerald-500/50 transition-all bg-gradient-to-br from-card to-emerald-500/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <Badge variant="active" className="text-xs">Free</Badge>
                  </div>
                  <p className="text-xl font-bold text-foreground mb-1">Log Your Games</p>
                  <p className="text-sm text-muted-foreground">
                    Track your games, earn tokens, compete on leaderboards
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500 text-white flex-shrink-0">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </Link>

          {/* League Tools */}
          <Link href="/tools">
            <Card variant="metric" accentColor="red" className="p-6 h-full cursor-pointer hover:border-jkap-red-500/50 transition-all bg-gradient-to-br from-card to-jkap-red-500/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-jkap-red-500/20">
                      <Sparkles className="w-5 h-5 text-jkap-red-500" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground mb-1">League Tools</p>
                  <p className="text-sm text-muted-foreground">
                    Game Recap Creator • IL Manager • Players Academy
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-jkap-red-500 text-white flex-shrink-0">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Rewards & Stats Widget - Only show if enabled */}
        {showRewardsWidget && (
          <div
            className={`mb-8 transition-all duration-500 delay-150 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Token Balance */}
              <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20">
                    <Coins className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">
                      {wallet?.token_balance?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-muted-foreground">Tokens</p>
                  </div>
                </div>
              </Card>

              {/* Games Played */}
              <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-600/5 border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20">
                    <Target className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-500">
                      {rewards?.games_played || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Games Played</p>
                  </div>
                </div>
              </Card>

              {/* Win Streak */}
              <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-600/5 border-orange-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/20">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-500">
                      {rewards?.current_streak || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Win Streak 🔥</p>
                  </div>
                </div>
              </Card>

              {/* Total Points */}
              <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-600/5 border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20">
                    <Star className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-500">
                      {rewards?.total_points || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Points</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Badges Row */}
            {rewards?.badges && rewards.badges.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-foreground">Your Badges</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rewards.badges.map((badge, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30"
                    >
                      <Medal className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-400">{badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats Link */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-green-500" />
                  Best Streak: {rewards?.longest_streak || 0}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Recaps: {rewards?.recaps_created || 0}
                </span>
              </div>
              <Button 
                as="link" 
                href="/wallet" 
                variant="ghost" 
                size="sm"
                icon={<ChevronRight className="w-4 h-4" />}
                iconPosition="right"
              >
                View Wallet
              </Button>
            </div>
          </div>
        )}

        {/* Quick Links - Only show if enabled */}
        {showQuickLinks && (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 transition-all duration-500 delay-150 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Documents Card */}
            <Link href="/documents">
              <Card variant="metric" accentColor="navy" className="p-5 cursor-pointer hover:border-jkap-navy-500/50 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      League Documents
                    </p>
                    <p className="text-xl font-bold text-foreground">Rules & Policies</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      View official league rules
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-jkap-navy-500/10 text-jkap-navy-400">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </Link>

            {/* SMS Registration Card */}
            <a href={MEMBERS_SMS_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
              <Card variant="metric" accentColor="success" className="p-5 cursor-pointer hover:border-green-500/50 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      SMS Updates
                    </p>
                    <p className="text-xl font-bold text-foreground">Get Text Alerts</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Register for league announcements
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </a>
          </div>
        )}

        {/* Announcements & Coming Soon - Only show if enabled */}
        {(showAnnouncements || showComingSoon) && (
          <div className={`grid ${showAnnouncements && showComingSoon ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
            {/* Announcements Widget */}
            {showAnnouncements && (
              <div
                className={`transition-all duration-500 delay-200 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-jkap-red-500" />
                        League Announcements
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Stay updated with the latest league news
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {notifications.slice(0, 3).map((notification, index) => (
                        <div
                          key={notification.id}
                          className={`inbox-item ${!notification.isRead ? 'unread' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <NotificationBadge type={notification.type} />
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(notification.timestamp)}
                              </span>
                            </div>
                            <h4 className={`font-medium truncate ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Coming Soon Widget */}
            {showComingSoon && (
              <div
                className={`transition-all duration-500 delay-300 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <Card className="h-full">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-jkap-red-500" />
                      Coming Soon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-lg bg-jkap-red-500/10 text-jkap-red-500">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Season Standings</p>
                          <p className="text-sm text-muted-foreground">Live win/loss records</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-lg bg-jkap-navy-500/10 text-jkap-navy-400">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Player Stats</p>
                          <p className="text-sm text-muted-foreground">League-wide statistics</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Rewards System</p>
                          <p className="text-sm text-muted-foreground">Earn points and badges</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Game Schedule</p>
                          <p className="text-sm text-muted-foreground">Upcoming matchups</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Off-Season & Resources Section */}
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          {/* Off-Season Planning Widget */}
          <div
            className={`transition-all duration-500 delay-350 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Off-Season Tasks
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Important deadlines and actions
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {offSeasonItems.slice(0, 3).map((item) => {
                  const deadlineDate = item.deadline ? new Date(item.deadline) : null;
                  const now = new Date();
                  const diffDays = deadlineDate 
                    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  return (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-xl border ${
                        item.status === 'active' 
                          ? 'bg-amber-500/5 border-amber-500/20' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">{item.title}</h4>
                            {item.status === 'active' && (
                              <Badge variant="delinquent" className="text-[10px]">ACTION</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {diffDays !== null && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className={diffDays <= 7 ? 'text-amber-400 font-medium' : 'text-muted-foreground'}>
                                {diffDays <= 0 ? 'Due today' : `${diffDays} days left`}
                              </span>
                            </div>
                          )}
                        </div>
                        {item.actionUrl && (
                          <Button
                            as="link"
                            href={item.actionUrl}
                            variant={item.status === 'active' ? 'primary' : 'ghost'}
                            size="sm"
                            icon={item.actionUrl.startsWith('http') ? <ExternalLink className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            iconPosition="right"
                          >
                            {item.actionLabel || 'View'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Quick Resources Widget */}
          <div
            className={`transition-all duration-500 delay-400 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-jkap-navy-400" />
                    Quick Resources
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    League documents and forms
                  </p>
                </div>
                <Button
                  as="link"
                  href="/documents"
                  variant="ghost"
                  size="sm"
                  icon={<ChevronRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {leagueDocuments.slice(0, 4).map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target={doc.type === 'form' ? '_blank' : undefined}
                    rel={doc.type === 'form' ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-jkap-navy-500/10 text-jkap-navy-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">{doc.title}</p>
                        {doc.isNew && (
                          <Badge variant="active" className="text-[10px]">NEW</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Members SMS Signup - Members Area */}
        <div
          className={`mt-8 p-6 rounded-2xl bg-gradient-to-r from-green-900/30 via-emerald-900/20 to-teal-900/30 border border-green-500/30 backdrop-blur-sm transition-all duration-500 delay-400 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  Members Area SMS Updates
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get exclusive league news, roster updates, deadlines, and events sent directly to your phone.
                </p>
              </div>
            </div>
            <a 
              href={MEMBERS_SMS_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/50 text-green-400 hover:bg-green-500/10 flex-shrink-0 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Sign Up for SMS
            </a>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div
          className={`mt-8 p-6 rounded-2xl bg-gradient-to-r from-jkap-navy-900/50 via-jkap-navy-800/30 to-jkap-red-900/20 border border-border backdrop-blur-sm transition-all duration-500 delay-450 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-jkap-red-500" />
                Ready to make moves?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the free agent pool or propose a trade to another owner.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                as="link" 
                href="/free-agents" 
                variant="outline"
                icon={<Users className="w-4 h-4" />}
              >
                Free Agents
              </Button>
              <Button 
                as="link" 
                href="/trades/new" 
                variant="primary"
                icon={<ArrowLeftRight className="w-4 h-4" />}
              >
                Propose Trade
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Wrap with ProtectedRoute for authentication
// Dashboard/Ballyard is only for JKAP League Members
export default function OwnerDashboard() {
  return (
    <ProtectedRoute requireJkapMember>
      <DashboardContent />
    </ProtectedRoute>
  );
}

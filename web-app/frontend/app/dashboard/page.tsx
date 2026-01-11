'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, SubscriptionBadge, NotificationBadge, StreakBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  TeamOwner,
  Team,
  Notification,
  mockOwner,
  mockTeam,
  mockNotifications,
  offSeasonItems,
  leagueDocuments,
} from '@/types/league';
import { MEMBERS_SMS_SIGNUP_URL } from '@/config/external-urls';
import {
  Trophy,
  CreditCard,
  DollarSign,
  Inbox,
  Settings,
  Users,
  BarChart3,
  ArrowLeftRight,
  ChevronRight,
  Play,
  Calendar,
  MapPin,
  Zap,
  Bell,
  TrendingUp,
  Clock,
  FileText,
  Sparkles,
  ExternalLink,
  Smartphone,
  MessageSquare,
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
  const [owner] = useState<TeamOwner>({ ...mockOwner, name: user?.displayName || mockOwner.name });
  const [team] = useState<Team>(mockTeam);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Simulate data loading animation
    setIsLoaded(true);
    
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Calculate win percentage
  const winPct = ((team.wins / (team.wins + team.losses)) * 100).toFixed(1);
  const budgetPct = ((team.budgetRemaining / team.budgetTotal) * 100).toFixed(0);

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
                  <span className="font-display text-white text-lg">{team.abbreviation}</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display text-foreground tracking-wide">
                    {getGreeting()}, {owner.name.split(' ')[0]}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <span>{team.name}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-sm">{team.division}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-sm">#{team.divisionRank} in Division</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Manager Tools */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Users className="w-4 h-4" />}
              >
                Roster
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<ArrowLeftRight className="w-4 h-4" />}
              >
                Trades
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<BarChart3 className="w-4 h-4" />}
              >
                Stats
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                icon={<Settings className="w-4 h-4" />}
              >
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-all duration-500 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Record Card */}
          <Card variant="metric" accentColor="red" className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Season Record
                </p>
                <p className="text-3xl font-bold text-foreground tracking-tight">{team.record}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">
                    {winPct}% Win Rate
                  </span>
                  <StreakBadge streak={team.streak} type={team.streakType} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-jkap-red-500/10 text-jkap-red-500">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* Subscription Card */}
          <Card variant="metric" accentColor="success" className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Franchise Status
                </p>
                <p className="text-2xl font-bold text-foreground mb-2">
                  Season Pass
                </p>
                <SubscriptionBadge status={owner.subscriptionStatus} />
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* Budget Card */}
          <Card variant="metric" accentColor="navy" className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Payroll Budget
                </p>
                <p className="text-3xl font-bold text-foreground tracking-tight">{team.budget}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Used</span>
                    <span>{budgetPct}% remaining</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-jkap-navy-500 to-jkap-navy-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${(team.budgetRemaining / team.budgetTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-jkap-navy-500/10 text-jkap-navy-400 ml-4">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* Inbox Card */}
          <Card
            variant="metric"
            accentColor={unreadCount > 0 ? 'warning' : 'navy'}
            className="p-5 cursor-pointer group"
            onClick={() => {}}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  Inbox
                </p>
                <p className="text-3xl font-bold text-foreground tracking-tight">
                  {unreadCount}
                  <span className="text-lg text-muted-foreground ml-1 font-normal">
                    unread
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {notifications.length} total messages
                </p>
              </div>
              <div
                className={`p-3 rounded-xl transition-transform group-hover:scale-105 ${
                  unreadCount > 0
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-jkap-navy-500/10 text-jkap-navy-400'
                }`}
              >
                <Inbox className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-jkap-red-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Inbox Widget - Takes 2 columns */}
          <div
            className={`lg:col-span-2 transition-all duration-500 delay-200 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-jkap-red-500" />
                    Message Center
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Trade offers, league announcements, and more
                  </p>
                </div>
                <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />} iconPosition="right">
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {notifications.slice(0, 5).map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`inbox-item ${!notification.isRead ? 'unread' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-jkap-red-500 animate-pulse" />
                      )}
                      
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
                        {notification.sender && (
                          <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            From: {notification.sender}
                          </p>
                        )}
                      </div>

                      {notification.actionUrl && (
                        <Link
                          href={notification.actionUrl}
                          className="flex-shrink-0 p-2 rounded-lg text-jkap-red-500 hover:text-jkap-red-400 hover:bg-jkap-red-500/10 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Matchup Widget */}
          <div
            className={`transition-all duration-500 delay-300 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Card className="matchup-card relative overflow-hidden h-full">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5 text-jkap-red-500" />
                  Next Matchup
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
                  {/* Home Team */}
                  <div className="text-center">
                    <div className="team-logo mx-auto mb-3 shadow-lg">
                      {team.abbreviation}
                    </div>
                    <p className="font-bold text-foreground text-lg">
                      {team.abbreviation}
                    </p>
                    <p className="text-sm text-muted-foreground">{team.record}</p>
                    <Badge variant="active" className="mt-2 text-[10px]">YOU</Badge>
                  </div>

                  {/* VS Badge */}
                  <div className="vs-badge shadow-glow-red">
                    <span className="font-display">VS</span>
                  </div>

                  {/* Away Team */}
                  <div className="text-center">
                    <div className="team-logo mx-auto mb-3 bg-gradient-to-br from-jkap-navy-600 to-jkap-navy-800 shadow-lg">
                      NYY
                    </div>
                    <p className="font-bold text-foreground text-lg">NYY</p>
                    <p className="text-sm text-muted-foreground">94-68</p>
                    <Badge variant="default" className="mt-2 text-[10px]">AWAY</Badge>
                  </div>
                </div>

                {/* Game Details */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Date & Time
                    </span>
                    <span className="text-foreground font-medium">
                      {team.nextGame.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Venue
                    </span>
                    <span className="text-foreground font-medium">
                      {team.nextGame.venue || 'TBD'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-green-500" />
                      Your Starter
                    </span>
                    <span className="text-foreground font-semibold">
                      {team.nextGame.pitcher}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-jkap-red-500" />
                      Opp. Starter
                    </span>
                    <span className="text-foreground font-semibold">
                      {team.nextGame.opponentPitcher || 'TBD'}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="primary"
                  fullWidth
                  className="mt-6"
                  icon={<Play className="w-5 h-5" />}
                >
                  Set Lineup
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

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

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { externalLinks, teamStreams, offSeasonItems } from '@/types/league';
import {
  Users,
  Trophy,
  ArrowLeftRight,
  FileText,
  UserPlus,
  ExternalLink,
  Calendar,
  Tv,
  Clock,
  ChevronRight,
  Sparkles,
  Target,
  MessageCircle,
} from 'lucide-react';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const features = [
    {
      icon: <Trophy className="w-8 h-8" />,
      title: 'The Ballyard',
      description: 'Your personalized owner dashboard. Manage your team, view standings, and track your franchise progress.',
      color: 'text-jkap-red-500',
      bgColor: 'bg-jkap-red-500/10',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Live Standings',
      description: 'Real-time league standings, statistics, and head-to-head records across all divisions.',
      color: 'text-jkap-navy-400',
      bgColor: 'bg-jkap-navy-500/10',
    },
    {
      icon: <ArrowLeftRight className="w-8 h-8" />,
      title: 'Trade Center',
      description: 'Propose, negotiate, and finalize trades with other owners through our streamlined system.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Free Agency',
      description: 'Browse and sign available players to fill gaps in your roster and strengthen your lineup.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
  ];

  const stats = [
    { label: 'Active Owners', value: '30' },
    { label: 'Games Played', value: '2,847' },
    { label: 'Trades Made', value: '156' },
    { label: 'Active Seasons', value: '4' },
  ];

  // Calculate days until next deadline
  const getDeadlineText = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-grid-pattern opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-jkap-navy-900/20 via-transparent to-background" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
            <div
              className={`text-center transition-all duration-700 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {/* League Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-jkap-red-500/10 border border-jkap-red-500/30 mb-8">
                <span className="w-2 h-2 rounded-full bg-jkap-red-500 animate-pulse" />
                <span className="text-sm font-medium text-jkap-red-400">
                  Season 4 Now Active
                </span>
              </div>

              {/* Main Title */}
              <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl text-foreground tracking-wide mb-6">
                JKAP MEMORIAL
                <br />
                <span className="text-jkap-red-500">LEAGUE</span>
              </h1>

              <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-4">
                The premier MLB The Show online league experience. 
                Build your dynasty, dominate the competition, and cement your legacy.
              </p>

              <p className="text-sm text-muted-foreground/80 mb-10 max-w-lg mx-auto">
                Celebrating the legacy of Jason Kingsley & Anthony Perez through the sport they loved 🤍⚾
              </p>

              {/* CTA Buttons - Join Our League prominently featured */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  as="link"
                  href={externalLinks.joinLeague}
                  variant="primary"
                  size="lg"
                  icon={<UserPlus className="w-5 h-5" />}
                >
                  Join Our League
                </Button>
                <Button
                  as="link"
                  href="/dashboard"
                  variant="outline"
                  size="lg"
                  icon={<Trophy className="w-5 h-5" />}
                >
                  Enter The Ballyard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/60 mt-4">
                Already a member? Access your dashboard in The Ballyard
              </p>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div
              className={`grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700 delay-200 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl sm:text-4xl font-bold text-foreground font-display">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Off-Season Announcements Section */}
        {offSeasonItems.filter(item => item.status === 'active').length > 0 && (
          <section className="py-12 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`transition-all duration-700 delay-250 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display text-2xl text-foreground">
                    OFF-SEASON UPDATES
                  </h2>
                  <Badge variant="delinquent" className="ml-2">Action Required</Badge>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offSeasonItems.filter(item => item.status === 'active' || item.status === 'upcoming').slice(0, 3).map((item) => (
                    <Card key={item.id} className="p-4 border-l-4 border-l-jkap-red-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                          {item.deadline && (
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Deadline:</span>
                              <span className={`font-medium ${
                                item.status === 'active' ? 'text-amber-400' : 'text-muted-foreground'
                              }`}>
                                {getDeadlineText(item.deadline)}
                              </span>
                            </div>
                          )}
                        </div>
                        {item.actionUrl && (
                          <Button
                            as="link"
                            href={item.actionUrl}
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className={`text-center mb-16 transition-all duration-700 delay-300 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-4">
                YOUR FRONT OFFICE
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to manage your franchise, all in one place.
              </p>
            </div>

            <div
              className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-700 delay-400 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="p-6 group"
                  hover
                >
                  <div className={`${feature.bgColor} ${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Watch Our Teams - Twitch Streams Grid */}
        <section className="py-20 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className={`text-center mb-12 transition-all duration-700 delay-450 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Tv className="w-6 h-6 text-purple-400" />
                <h2 className="font-display text-3xl sm:text-4xl text-foreground">
                  WATCH OUR TEAMS
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Click on any team to be directed to their live Twitch stream. Watch games in real-time and cheer on your favorite teams!
              </p>
            </div>

            <div
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 transition-all duration-700 delay-500 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {teamStreams.map((team) => (
                <a
                  key={team.abbreviation}
                  href={team.twitchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4 rounded-xl bg-card border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-jkap-navy-600 flex items-center justify-center font-display text-white text-sm">
                      {team.abbreviation}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium truncate">{team.name}</p>
                      <div className="flex items-center gap-1 text-purple-400 text-xs mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        <span>Watch Live</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Join Our League CTA Section */}
        <section className="py-20 sm:py-32 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-jkap-navy-900/50 via-background to-jkap-red-900/20" />
          <div className="absolute inset-0 bg-diagonal-lines" />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className={`transition-all duration-700 delay-500 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="inline-flex items-center gap-2 mb-6">
                <UserPlus className="w-5 h-5 text-jkap-red-500" />
                <Badge variant="outline">Join Our League</Badge>
              </div>
              
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
                BECOME AN OWNER
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Apply to join the JKAP Memorial League. Complete our brief interview process, 
                and if approved, you'll receive a unique access code to become an official owner.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  as="link"
                  href={externalLinks.joinLeague}
                  variant="primary"
                  size="lg"
                  icon={<ExternalLink className="w-4 h-4" />}
                  iconPosition="right"
                >
                  Join Our League
                </Button>
                <Button
                  as="link"
                  href={externalLinks.contactForm}
                  variant="ghost"
                  size="lg"
                  icon={<MessageCircle className="w-4 h-4" />}
                >
                  Contact Us
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Your approval code will be sent via SMS. League currently at capacity? You'll be added to our waitlist.
              </p>
            </div>
          </div>
        </section>

        {/* League Documents Quick Access */}
        <section className="py-16 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="font-display text-2xl text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-jkap-red-500" />
                  LEAGUE DOCUMENTS
                </h2>
                <p className="text-muted-foreground">
                  Access rules, trading guidelines, schedules, and more.
                </p>
              </div>
              <Button
                as="link"
                href="/documents"
                variant="secondary"
                icon={<ChevronRight className="w-4 h-4" />}
                iconPosition="right"
              >
                View All Documents
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 border-t border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-4">
              READY TO COMPETE?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join the league and start building your championship roster today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                as="link"
                href={externalLinks.memberRegistration}
                variant="primary"
                size="lg"
              >
                Join Our League
              </Button>
              <Button
                as="link"
                href="/dashboard"
                variant="outline"
                size="lg"
              >
                Access The Ballyard
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

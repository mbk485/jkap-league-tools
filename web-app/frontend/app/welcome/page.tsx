'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Trophy,
  CheckCircle,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Users,
  Gamepad2,
  FileText,
  AlertTriangle,
  Loader2,
  Star,
  Shield,
  Clock,
  Zap,
  Check,
  ExternalLink,
} from 'lucide-react';
import { MLB_TEAMS } from '@/types/league';
import {
  getUserOnboarding,
  updateUserOnboarding,
  acknowledgeRules,
  markSmsRegistered,
  completeOnboarding,
  needsOnboarding,
  getWelcomePacket,
  DBWelcomePacket,
} from '@/lib/supabase';

// Discord invite link - use the welcome packet discord_link when available
// This is a fallback that should be updated if the invite expires
const DEFAULT_DISCORD_INVITE_LINK = 'https://discord.gg/AMDGBuP5';

// League rules - Trading rules and key league info
const LEAGUE_RULES = {
  trading: [
    {
      rule: 'New Member Trade Limit',
      description: 'New members get 1 trade upon joining the league.',
      icon: '🔄',
    },
    {
      rule: '15-Game Trading Threshold',
      description: 'After your first trade, you must complete 15 games before trading again.',
      icon: '📊',
    },
    {
      rule: 'Trade Deadline',
      description: 'All trades must be approved by the commissioner and will be reviewed within 24 hours.',
      icon: '⏰',
    },
    {
      rule: 'Fair Value Trades',
      description: 'All trades must be fair and balanced. Lopsided trades will be rejected.',
      icon: '⚖️',
    },
  ],
  gameplay: [
    {
      rule: 'Minimum Games Per Week',
      description: 'You must play a minimum of 3 games per week to remain active in the league.',
      icon: '🎮',
    },
    {
      rule: 'Injured List (IL) Rules',
      description: 'Players placed on IL must stay for minimum 5 games. Once activated, they must remain on your active roster for 5 games.',
      icon: '🏥',
    },
    {
      rule: 'Game Reporting',
      description: 'Report all game scores using the Game Recap tool. This helps track standings and stats.',
      icon: '📝',
    },
    {
      rule: 'Sportsmanship',
      description: 'Respect your opponents. No cheesing, excessive bunting, or unsportsmanlike conduct.',
      icon: '🤝',
    },
  ],
  communication: [
    {
      rule: 'Discord Required',
      description: 'Join our Discord server for matchup coordination, announcements, and community chat.',
      icon: '💬',
    },
    {
      rule: 'Facebook Group',
      description: 'Join our Facebook group for league updates and announcements.',
      icon: '📱',
    },
    {
      rule: 'Response Time',
      description: 'Respond to matchup requests within 24 hours. Ghosting opponents may result in removal.',
      icon: '⏳',
    },
  ],
};

type OnboardingStep = 'welcome' | 'sms-registration' | 'rules' | 'trading' | 'tools' | 'join-game' | 'checklist' | 'complete';

// Easy Texting form URL for SMS registration
const EASY_TEXTING_FORM_URL = 'https://storage.googleapis.com/cf-prod-widgets/433290282658963456-EZ/7406a3e5-35c8-4662-86ff-d4cf21a8bf6a/f8211439-8e42-46e2-91f4-9f230d9cd711-1746793700230.html';

export default function WelcomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);
  const [welcomePacket, setWelcomePacket] = useState<DBWelcomePacket | null>(null);
  
  // Checklist state
  const [checklist, setChecklist] = useState({
    readRules: false,
    joinedInGameLeague: false,
    joinDiscord: false,
    joinFacebook: false,
    addPSNFriends: false,
  });

  // Get team info
  const userTeam = user?.teamId 
    ? MLB_TEAMS.find(t => t.id === user.teamId)
    : null;

  useEffect(() => {
    const loadOnboarding = async () => {
      if (!user?.id) {
        setIsLoading(false);
        router.push('/login');
        return;
      }

      try {
        console.log('Welcome: Checking if onboarding already complete for user:', user.id);

        const needs = await needsOnboarding(user.id);
        console.log('Welcome: needsOnboarding result:', needs);

        if (!needs) {
          console.log('Welcome: Onboarding already complete, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }

        const packet = await getWelcomePacket();
        setWelcomePacket(packet);
      } catch (err) {
        console.error('Welcome: loadOnboarding failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      void loadOnboarding();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleAcknowledgeRules = async () => {
    if (!user?.id) return;
    
    setRulesAcknowledged(true);
    setChecklist(prev => ({ ...prev, readRules: true }));
    await acknowledgeRules(user.id);
    setCurrentStep('trading');
  };

  const handleCompleteOnboarding = async () => {
    if (!user?.id) {
      console.error('No user ID available for onboarding completion');
      return;
    }
    
    console.log('Starting onboarding completion for user:', user.id);
    
    try {
      // Save checklist status
      console.log('Saving checklist status...');
      const checklistResult = await updateUserOnboarding(user.id, {
        discord_joined: checklist.joinDiscord,
        facebook_joined: checklist.joinFacebook,
        psn_friends_added: checklist.addPSNFriends,
      });
      
      if (!checklistResult.success) {
        console.error('Failed to save checklist:', checklistResult.error);
      } else {
        console.log('Checklist saved successfully');
      }
      
      // Mark onboarding as complete
      console.log('Marking onboarding as complete...');
      const completeResult = await completeOnboarding(user.id);
      
      if (!completeResult.success) {
        console.error('Failed to complete onboarding:', completeResult.error);
      } else {
        console.log('Onboarding marked complete successfully');
      }
      
      setCurrentStep('complete');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      // Still allow user to proceed to avoid getting stuck
      setCurrentStep('complete');
    }
  };

  const allChecklistComplete = checklist.readRules && checklist.joinedInGameLeague && checklist.joinDiscord;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Welcome step
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to JKAP Memorial League! 🎉
              </h1>
              <p className="text-amber-100">
                {user?.displayName || user?.username}, you're officially in!
              </p>
            </div>

            <CardContent className="p-8">
              {/* Team Assignment */}
              {userTeam && (
                <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl mb-6">
                  <div className="w-16 h-16 rounded-xl bg-slate-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{userTeam.abbreviation}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Your Team</p>
                    <p className="text-xl font-bold text-white">{userTeam.name}</p>
                    <p className="text-sm text-slate-400">{userTeam.abbreviation}</p>
                  </div>
                </div>
              )}

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <Star className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">162-Game Seasons</p>
                  <p className="text-xs text-slate-400">Full MLB experience</p>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
                  <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">Commissioner Oversight</p>
                  <p className="text-xs text-slate-400">Fair & balanced play</p>
                </div>
              </div>

              {/* Welcome Message */}
              {welcomePacket && (
                <div className="p-4 bg-slate-700/50 rounded-xl mb-6">
                  <p className="text-slate-300 whitespace-pre-line text-sm">
                    {String(welcomePacket.welcome_message ?? '')
                      .replace('{{name}}', user?.displayName || user?.username || 'New Member')
                      .replace('{{team}}', userTeam?.name || 'Your Team')}
                  </p>
                </div>
              )}

              <Button
                fullWidth
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                onClick={() => setCurrentStep('sms-registration')}
              >
                Let's Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // SMS Registration step - MANDATORY for all approved members
  if (currentStep === 'sms-registration') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Register for SMS Updates</h2>
                  <p className="text-sm text-slate-400">Required step for all league members</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Mandatory Notice */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-400">MANDATORY FOR ALL MEMBERS</p>
                    <p className="text-red-300/80 text-sm mt-1">
                      You <strong>MUST</strong> complete this registration to receive league updates.
                      If you do not register, <strong>your games will NOT count</strong> and you may miss important deadlines.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why SMS Registration */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  Why SMS Registration?
                </h3>
                <div className="grid gap-3">
                  <div className="p-3 bg-slate-700/50 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Instant League Updates</p>
                      <p className="text-sm text-slate-400">Get notified about roster updates, deadlines, and announcements</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Never Miss a Deadline</p>
                      <p className="text-sm text-slate-400">Free agency, draft, and trade deadline reminders sent directly to you</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Active Member Verification</p>
                      <p className="text-sm text-slate-400">Confirms you as an official league member (not just an applicant)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Embedded Form */}
              <div className="mb-6">
                <div className="p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl">
                  <p className="text-amber-400 font-semibold text-center mb-4">
                    Complete the form below to register:
                  </p>
                  <div className="bg-white rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
                    <iframe
                      src={EASY_TEXTING_FORM_URL}
                      width="100%"
                      height="500"
                      frameBorder="0"
                      style={{ border: 'none' }}
                      title="SMS Registration Form"
                    />
                  </div>
                </div>
              </div>

              {/* Having trouble notice */}
              <div className="p-3 bg-slate-700/30 rounded-xl mb-6">
                <p className="text-slate-400 text-sm text-center">
                  Having trouble with the form? 
                  <button
                    onClick={() => window.open(EASY_TEXTING_FORM_URL, '_blank')}
                    className="text-amber-400 hover:text-amber-300 underline ml-1"
                  >
                    Open in new tab
                  </button>
                </p>
              </div>

              {/* Continue Button */}
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep('welcome')}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                  onClick={async () => {
                    localStorage.setItem('sms_registration_completed', 'true');
                    if (user?.id) {
                      await markSmsRegistered(user.id);
                    }
                    setCurrentStep('rules');
                  }}
                >
                  I've Completed Registration - Continue
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-3">
                By clicking continue, you confirm that you have completed the SMS registration form above.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Rules step
  if (currentStep === 'rules') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">League Rules & Guidelines</h2>
                  <p className="text-sm text-slate-400">Please read carefully before proceeding</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Gameplay Rules */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                  Gameplay Rules
                </h3>
                <div className="space-y-3">
                  {LEAGUE_RULES.gameplay.map((rule, i) => (
                    <div key={i} className="p-4 bg-slate-700/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{rule.icon}</span>
                        <div>
                          <p className="font-medium text-white">{rule.rule}</p>
                          <p className="text-sm text-slate-400">{rule.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication Rules */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  Communication
                </h3>
                <div className="space-y-3">
                  {LEAGUE_RULES.communication.map((rule, i) => (
                    <div key={i} className="p-4 bg-slate-700/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{rule.icon}</span>
                        <div>
                          <p className="font-medium text-white">{rule.rule}</p>
                          <p className="text-sm text-slate-400">{rule.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Notice */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-400">Important</p>
                    <p className="text-sm text-slate-300">
                      Failure to follow league rules may result in warnings or removal from the league. 
                      If you have questions, contact the commissioner.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep('sms-registration')}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  icon={<CheckCircle className="w-4 h-4" />}
                  onClick={handleAcknowledgeRules}
                >
                  I've Read & Understand the Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Trading Rules step
  if (currentStep === 'trading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Trading Rules</h2>
                  <p className="text-sm text-slate-400">Important rules for making trades</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Key Trading Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl text-center">
                  <p className="text-4xl font-bold text-emerald-400 mb-1">1</p>
                  <p className="text-sm font-medium text-white">Free Trade as New Member</p>
                  <p className="text-xs text-slate-400">Use it wisely!</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl text-center">
                  <p className="text-4xl font-bold text-blue-400 mb-1">15</p>
                  <p className="text-sm font-medium text-white">Games Before Next Trade</p>
                  <p className="text-xs text-slate-400">After your first trade</p>
                </div>
              </div>

              {/* All Trading Rules */}
              <div className="space-y-3 mb-8">
                {LEAGUE_RULES.trading.map((rule, i) => (
                  <div key={i} className="p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{rule.icon}</span>
                      <div>
                        <p className="font-medium text-white">{rule.rule}</p>
                        <p className="text-sm text-slate-400">{rule.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep('rules')}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                  onClick={() => setCurrentStep('tools')}
                >
                  Continue to Tools Overview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tools Overview step
  if (currentStep === 'tools') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Your League Tools</h2>
                  <p className="text-sm text-slate-400">Here's what you have access to</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="space-y-4 mb-8">
                {/* Game Recap Creator */}
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Game Recap Creator</p>
                      <p className="text-sm text-slate-400 mb-2">
                        Generate professional game recaps after each game. Upload screenshots or enter game data manually.
                      </p>
                      <Badge variant="active">Available Now</Badge>
                    </div>
                  </div>
                </div>

                {/* IL Manager */}
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Injured List Manager</p>
                      <p className="text-sm text-slate-400 mb-2">
                        Track IL placements and activations. Auto-posts to Discord when enabled.
                      </p>
                      <Badge variant="active">Available Now</Badge>
                    </div>
                  </div>
                </div>

                {/* Players Academy */}
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Players Academy</p>
                      <p className="text-sm text-slate-400 mb-2">
                        Get AI-powered analysis of your gameplay. Upload screenshots to identify strengths and areas for improvement.
                      </p>
                      <Badge variant="active">Available Now</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep('trading')}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                  onClick={() => setCurrentStep('join-game')}
                >
                  Continue to Join League
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Join In-Game League step
  if (currentStep === 'join-game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Join the League In-Game</h2>
                  <p className="text-sm text-slate-400">Connect to our Custom League</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Important Notice */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-400">Important Step!</p>
                    <p className="text-sm text-slate-300">
                      You must join the league in MLB The Show to play games with us.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step by Step Instructions */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🎮</span>
                  How to Join the League
                </h3>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Open MLB The Show</p>
                        <p className="text-sm text-slate-400">
                          Launch the game on your PlayStation or Xbox
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Go to Custom League</p>
                        <p className="text-sm text-slate-400">
                          Select "Custom League" from the main menu
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Search for Our League</p>
                        <p className="text-sm text-slate-400">
                          Click "Search" or "Find League" and enter:
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* League Name Highlight */}
                  <div className="p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl text-center">
                    <p className="text-sm text-slate-400 mb-2">League Name</p>
                    <p className="text-3xl font-bold text-white tracking-wide">
                      Jkapmemorial
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      (all one word, no spaces)
                    </p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Join & Select Your Team</p>
                        <p className="text-sm text-slate-400">
                          Find our league and click "Join" - select{' '}
                          <span className="text-amber-400 font-medium">
                            {userTeam?.name || 'your assigned team'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-400">You're In!</p>
                        <p className="text-sm text-slate-300">
                          Once you join, you'll see your team roster and can start playing games!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox to confirm */}
              <div 
                className={`p-4 rounded-xl border transition-colors cursor-pointer mb-6 ${
                  checklist.joinedInGameLeague 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => setChecklist(prev => ({ ...prev, joinedInGameLeague: !prev.joinedInGameLeague }))}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    checklist.joinedInGameLeague 
                      ? 'border-emerald-400 bg-emerald-400' 
                      : 'border-slate-500'
                  }`}>
                    {checklist.joinedInGameLeague && <Check className="w-4 h-4 text-slate-900" />}
                  </div>
                  <div>
                    <p className={`font-medium ${checklist.joinedInGameLeague ? 'text-emerald-400' : 'text-white'}`}>
                      I've joined the league in MLB The Show
                    </p>
                    <p className="text-xs text-slate-400">
                      (or I'll do this right after onboarding)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep('tools')}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                  onClick={() => setCurrentStep('checklist')}
                >
                  Continue to Final Steps
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Checklist step
  if (currentStep === 'checklist') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Final Checklist</h2>
                  <p className="text-sm text-slate-400">Complete these steps to get started</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="space-y-3 mb-8">
                {/* Read Rules */}
                <div 
                  className={`p-4 rounded-xl border transition-colors ${
                    checklist.readRules 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      checklist.readRules 
                        ? 'border-emerald-400 bg-emerald-400' 
                        : 'border-slate-500'
                    }`}>
                      {checklist.readRules && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${checklist.readRules ? 'text-emerald-400' : 'text-white'}`}>
                        Read League Rules
                      </p>
                      <p className="text-xs text-slate-400">Required</p>
                    </div>
                    {checklist.readRules && (
                      <Badge variant="active">Complete</Badge>
                    )}
                  </div>
                </div>

                {/* Join In-Game League */}
                <div 
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    checklist.joinedInGameLeague 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setChecklist(prev => ({ ...prev, joinedInGameLeague: !prev.joinedInGameLeague }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      checklist.joinedInGameLeague 
                        ? 'border-emerald-400 bg-emerald-400' 
                        : 'border-slate-500'
                    }`}>
                      {checklist.joinedInGameLeague && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${checklist.joinedInGameLeague ? 'text-emerald-400' : 'text-white'}`}>
                        Join League In-Game (Jkapmemorial)
                      </p>
                      <p className="text-xs text-slate-400">Required - Search "Jkapmemorial" in Custom League</p>
                    </div>
                    {checklist.joinedInGameLeague && (
                      <Badge variant="active">Complete</Badge>
                    )}
                  </div>
                </div>

                {/* Join Discord */}
                <div 
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    checklist.joinDiscord 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setChecklist(prev => ({ ...prev, joinDiscord: !prev.joinDiscord }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      checklist.joinDiscord 
                        ? 'border-emerald-400 bg-emerald-400' 
                        : 'border-slate-500'
                    }`}>
                      {checklist.joinDiscord && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${checklist.joinDiscord ? 'text-emerald-400' : 'text-white'}`}>
                        Join Discord Server
                      </p>
                      <p className="text-xs text-slate-400">Required</p>
                    </div>
                    <a 
                      href={welcomePacket?.discord_link || DEFAULT_DISCORD_INVITE_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Join <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Join Facebook */}
                <div 
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    checklist.joinFacebook 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setChecklist(prev => ({ ...prev, joinFacebook: !prev.joinFacebook }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      checklist.joinFacebook 
                        ? 'border-emerald-400 bg-emerald-400' 
                        : 'border-slate-500'
                    }`}>
                      {checklist.joinFacebook && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${checklist.joinFacebook ? 'text-emerald-400' : 'text-white'}`}>
                        Join Facebook Group
                      </p>
                      <p className="text-xs text-slate-400">Recommended</p>
                    </div>
                    {welcomePacket?.facebook_link && (
                      <a 
                        href={welcomePacket.facebook_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Add PSN Friends */}
                <div 
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    checklist.addPSNFriends 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setChecklist(prev => ({ ...prev, addPSNFriends: !prev.addPSNFriends }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      checklist.addPSNFriends 
                        ? 'border-emerald-400 bg-emerald-400' 
                        : 'border-slate-500'
                    }`}>
                      {checklist.addPSNFriends && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${checklist.addPSNFriends ? 'text-emerald-400' : 'text-white'}`}>
                        Add League Members on PSN
                      </p>
                      <p className="text-xs text-slate-400">Get PSN IDs from Discord</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep('join-game')}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  disabled={!allChecklistComplete}
                  icon={<Trophy className="w-4 h-4" />}
                  onClick={handleCompleteOnboarding}
                >
                  {allChecklistComplete ? "Let's Play Ball!" : "Complete Required Steps"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle going to dashboard with verification
  const handleGoToDashboard = async () => {
    console.log('Go to Dashboard clicked');
    setIsNavigating(true);
    
    if (!user?.id) {
      console.log('No user ID, navigating anyway');
      window.location.href = '/dashboard?onboarded=1';
      return;
    }
    
    // Ensure onboarding is marked complete one more time (belt and suspenders)
    console.log('Final onboarding completion check for user:', user.id);
    try {
      await completeOnboarding(user.id);
    } catch (e) {
      console.error('Error in completeOnboarding:', e);
    }
    
    // Small delay to ensure localStorage is fully written before navigation
    // This prevents race conditions with the dashboard's onboarding check
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('Navigating to dashboard');
    // Use window.location for more reliable navigation on mobile
    // Add onboarded=1 parameter as a backup signal
    window.location.href = '/dashboard?onboarded=1';
  };

  // Auto-redirect fallback: if user stays on complete screen for 5 seconds, redirect automatically
  useEffect(() => {
    if (currentStep === 'complete' && user?.id && !isNavigating) {
      const timer = setTimeout(() => {
        console.log('Auto-redirect fallback triggered');
        handleGoToDashboard();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, user?.id, isNavigating]);

  // Complete step
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-800/50 border-slate-700 text-center overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're All Set! 🎉</h1>
          <p className="text-emerald-100">
            Welcome to the league, {user?.displayName || user?.username}!
          </p>
        </div>

        <CardContent className="p-6">
          <p className="text-slate-300 mb-6">
            You're ready to start playing. Head to your dashboard to access all your tools and start competing!
          </p>
          <Button
            fullWidth
            icon={isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            iconPosition="right"
            onClick={handleGoToDashboard}
            disabled={isNavigating}
          >
            {isNavigating ? 'Taking you to the League...' : 'Go to Dashboard'}
          </Button>
          
          {/* Manual link fallback */}
          <p className="text-xs text-slate-500 mt-4">
            Button not working? <a href="/dashboard?onboarded=1" className="text-emerald-400 hover:underline">Click here to go to the dashboard</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MLB_TEAMS } from '@/types/league';
import {
  User,
  Mail,
  Phone,
  Gamepad2,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Star,
  Trophy,
  Users,
  Clock,
} from 'lucide-react';
import {
  addRegistrationRequest,
  checkIfBanned,
  getTeamStatuses,
  DBTeamStatus,
} from '@/lib/supabase';

export default function JoinPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [teamStatuses, setTeamStatuses] = useState<DBTeamStatus[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    phone: '',
    psnId: '',
    discordUsername: '',
    requestedTeamId: '',
    approvalCode: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Load team statuses to show available teams
  useEffect(() => {
    const loadTeamStatuses = async () => {
      setIsLoadingTeams(true);
      try {
        const statuses = await getTeamStatuses();
        setTeamStatuses(statuses);
      } catch (err) {
        console.error('Error loading team statuses:', err);
      }
      setIsLoadingTeams(false);
    };
    loadTeamStatuses();
  }, []);

  // Get available teams (open or reserved)
  const availableTeams = MLB_TEAMS.filter(team => {
    const status = teamStatuses.find(s => s.team_id === team.id);
    return !status || status.status !== 'occupied';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPasswordError('');

    // Validate required fields
    if (!formData.username || !formData.displayName || !formData.email || !formData.phone || !formData.requestedTeamId) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    // Validate password
    if (!formData.password || formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Check if banned
      const banCheck = await checkIfBanned(formData.username, formData.email, formData.phone, formData.psnId);
      if (banCheck.isBanned) {
        setError(`Registration blocked: ${banCheck.banInfo?.ban_reason || 'You are not eligible to join this league.'}`);
        setIsLoading(false);
        return;
      }

      // Submit registration request
      const result = await addRegistrationRequest({
        username: formData.username.toLowerCase().trim(),
        display_name: formData.displayName.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        psn_id: formData.psnId.trim() || undefined,
        discord_username: formData.discordUsername.trim() || undefined,
        requested_team_id: formData.requestedTeamId,
        approval_code: formData.approvalCode.trim() || undefined,
        password: formData.password,
      });

      if (result.success) {
        setIsSubmitted(true);
      } else {
        console.error('Registration failed:', result.error);
        // Provide more user-friendly error messages
        if (result.error?.includes('duplicate') || result.error?.includes('unique')) {
          setError('An account with this username or email already exists. Please try different credentials or contact the commissioner.');
        } else if (result.error?.includes('permission') || result.error?.includes('RLS') || result.error?.includes('policy')) {
          setError('Unable to submit registration at this time. Please contact the commissioner directly.');
        } else {
          setError(result.error || 'Failed to submit registration. Please try again or contact the commissioner.');
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again or contact the commissioner.');
    }

    setIsLoading(false);
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Application Submitted! 🎉
            </h1>
            <p className="text-slate-300 mb-6">
              Your registration request has been submitted and is awaiting approval from the commissioner.
            </p>
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">You'll start in Rookie Ball!</span>
              </div>
              <p className="text-xs text-slate-300">
                Prove yourself and work your way up through Single-A, Double-A, Triple-A, and eventually to the Majors!
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-400 mb-2">What happens next?</p>
              <ul className="text-sm text-left text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>The commissioner will review your application</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>You'll receive login credentials upon approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>You'll get 50 welcome bonus tokens to start!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>You'll get Discord and Facebook group access</span>
                </li>
              </ul>
            </div>
            <Button as="link" href="/" variant="secondary" fullWidth>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Join JKAP Memorial League
          </h1>
          <p className="text-slate-400">
            Fill out the form below to apply for league membership
          </p>
        </div>

        {/* Road to the Show - Minor League Progression */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Road to the Show</h3>
              <p className="text-sm text-slate-400">Work your way up through our minor league system!</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center mx-auto mb-1 text-xs font-bold text-slate-300">5</div>
              <p className="text-xs text-slate-400">Rookie</p>
            </div>
            <div className="text-slate-600">→</div>
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-1 text-xs font-bold text-red-400">4</div>
              <p className="text-xs text-slate-400">Single-A</p>
            </div>
            <div className="text-slate-600">→</div>
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-1 text-xs font-bold text-blue-400">3</div>
              <p className="text-xs text-slate-400">Double-A</p>
            </div>
            <div className="text-slate-600">→</div>
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-1 text-xs font-bold text-purple-400">2</div>
              <p className="text-xs text-slate-400">Triple-A</p>
            </div>
            <div className="text-slate-600">→</div>
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-1 text-xs font-bold text-amber-400">1</div>
              <p className="text-xs text-slate-400">Majors</p>
            </div>
          </div>
          <p className="text-xs text-center text-slate-400 mt-4">
            New players start in Rookie Ball • Earn promotions through activity & performance
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Earn Your Way Up</p>
            <p className="text-xs text-slate-400">Unlock perks & tools</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Fair Competition</p>
            <p className="text-xs text-slate-400">Play at your level</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Active Community</p>
            <p className="text-xs text-slate-400">Discord & Facebook</p>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-amber-400" />
              Registration Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setPasswordError('');
                    }}
                    placeholder="Create a password"
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-xl text-white placeholder-slate-400 focus:outline-none ${
                      passwordError ? 'border-red-500' : 'border-slate-600 focus:border-amber-500'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      setPasswordError('');
                    }}
                    placeholder="Confirm your password"
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-xl text-white placeholder-slate-400 focus:outline-none ${
                      passwordError ? 'border-red-500' : 'border-slate-600 focus:border-amber-500'
                    }`}
                    required
                  />
                </div>
              </div>
              {passwordError && (
                <p className="text-sm text-red-400 -mt-2">{passwordError}</p>
              )}

              {/* Gaming Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Gamepad2 className="w-4 h-4 inline mr-1" />
                    PSN ID
                  </label>
                  <input
                    type="text"
                    value={formData.psnId}
                    onChange={(e) => setFormData({ ...formData, psnId: e.target.value })}
                    placeholder="Your PlayStation ID"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Discord Username
                  </label>
                  <input
                    type="text"
                    value={formData.discordUsername}
                    onChange={(e) => setFormData({ ...formData, discordUsername: e.target.value })}
                    placeholder="user#1234"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Requested Team <span className="text-red-400">*</span>
                </label>
                {isLoadingTeams ? (
                  <div className="flex items-center gap-2 text-slate-400 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading available teams...</span>
                  </div>
                ) : (
                  <select
                    value={formData.requestedTeamId}
                    onChange={(e) => setFormData({ ...formData, requestedTeamId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    required
                  >
                    <option value="">Select a team...</option>
                    {availableTeams.map(team => {
                      const status = teamStatuses.find(s => s.team_id === team.id);
                      return (
                        <option key={team.id} value={team.id}>
                          {team.name} {status?.status === 'reserved' ? '(Reserved - contact commissioner)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
                {availableTeams.length === 0 && !isLoadingTeams && (
                  <p className="text-sm text-amber-400 mt-2">
                    All teams are currently occupied. Contact the commissioner for availability.
                  </p>
                )}
              </div>

              {/* Approval Code */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Approval Code <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                </label>
                <input
                  type="text"
                  value={formData.approvalCode}
                  onChange={(e) => setFormData({ ...formData, approvalCode: e.target.value })}
                  placeholder="Enter code if you have one"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-slate-400 mt-2">
                  If the commissioner gave you an approval code, enter it here for faster processing.
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || availableTeams.length === 0}
                fullWidth
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              >
                {isLoading ? 'Submitting...' : 'Submit Application'}
              </Button>

              <p className="text-center text-xs text-slate-400">
                Already a member?{' '}
                <Link href="/login" className="text-amber-400 hover:underline">
                  Sign in here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

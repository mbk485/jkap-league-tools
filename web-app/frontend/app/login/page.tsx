'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MLB_TEAMS } from '@/types/league';
import {
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  UserPlus,
  Check,
  ChevronDown,
  Shield,
  Users,
} from 'lucide-react';

type AuthMode = 'login' | 'register';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isAuthenticated, isLoading, getAllUsers, user } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimedTeams, setClaimedTeams] = useState<string[]>([]);

  const redirectUrl = searchParams.get('redirect') || '/tools';

  // Load claimed teams
  useEffect(() => {
    const users = getAllUsers();
    const claimed = users
      .filter((u) => !u.isAdmin && u.teamId)
      .map((u) => u.teamId);
    setClaimedTeams(claimed);
  }, [getAllUsers]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      // Non-admins go to tools, admins can go anywhere
      if (user.isAdmin) {
        router.push(redirectUrl);
      } else {
        router.push('/tools');
      }
    }
  }, [isAuthenticated, isLoading, router, redirectUrl, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await login(username, password);
    
    if (!success) {
      setError('Invalid username or password. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!selectedTeam) {
      setError('Please select your team.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(username, password, displayName, selectedTeam);
    
    if (!result.success) {
      setError(result.error || 'Registration failed. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const availableTeams = MLB_TEAMS.filter((team) => !claimedTeams.includes(team.id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-jkap-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-jkap-navy-900/50 via-background to-jkap-red-900/20" />

      <div className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center mx-auto mb-4 shadow-glow-red">
                <span className="font-display text-white text-2xl">JK</span>
              </div>
            </Link>
            <h1 className="font-display text-3xl text-foreground">
              JKAP MEMORIAL LEAGUE
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === 'login' ? 'Sign in to access league tools' : 'Create your owner account'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="text-center">
                {mode === 'login' ? 'Welcome Back' : 'Join the League'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mode === 'login' ? (
                // LOGIN FORM
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-jkap-red-500/10 border border-jkap-red-500/30 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-jkap-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-jkap-red-400">{error}</p>
                    </div>
                  )}

                  {/* Username Field */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all"
                        placeholder="Enter your username"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={isSubmitting}
                    icon={<LogIn className="w-5 h-5" />}
                  >
                    Sign In
                  </Button>

                  {/* Admin Credentials */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <p className="text-xs font-semibold text-amber-400">Commissioner Login</p>
                    </div>
                    <div className="space-y-1 text-xs font-mono text-amber-300">
                      <p>Username: commissioner</p>
                      <p>Password: jkap2024</p>
                    </div>
                  </div>
                </form>
              ) : (
                // REGISTER FORM
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-jkap-red-500/10 border border-jkap-red-500/30 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-jkap-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-jkap-red-400">{error}</p>
                    </div>
                  )}

                  {/* Display Name */}
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all"
                        placeholder="John Smith"
                        required
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label htmlFor="reg-username" className="block text-sm font-medium text-foreground mb-2">
                      Choose a Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <input
                        type="text"
                        id="reg-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all lowercase"
                        placeholder="johndoe"
                        required
                        minLength={3}
                        autoComplete="username"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This is what you'll use to log in
                    </p>
                  </div>

                  {/* Team Selection */}
                  <div>
                    <label htmlFor="team" className="block text-sm font-medium text-foreground mb-2">
                      Select Your Team
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <select
                        id="team"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Choose your team...</option>
                        {availableTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} ({team.abbreviation})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {30 - claimedTeams.length} teams available • {claimedTeams.length} claimed
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="reg-password" className="block text-sm font-medium text-foreground mb-2">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="reg-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 rounded-xl bg-muted border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent transition-all ${
                          confirmPassword && confirmPassword === password
                            ? 'border-emerald-500'
                            : confirmPassword && confirmPassword !== password
                            ? 'border-red-500'
                            : 'border-border'
                        }`}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                      {confirmPassword && confirmPassword === password && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={isSubmitting}
                    icon={<UserPlus className="w-5 h-5" />}
                  >
                    Create Account
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-jkap-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

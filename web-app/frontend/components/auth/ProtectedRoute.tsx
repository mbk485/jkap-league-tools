'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lock, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireJkapMember?: boolean; // New: Only JKAP league members can access
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireJkapMember = false 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login with return URL
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
    
    if (!isLoading && isAuthenticated && requireAdmin && !user?.isAdmin) {
      // Not an admin, redirect to tools
      router.push('/tools');
    }
  }, [isLoading, isAuthenticated, requireAdmin, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="font-display text-white text-2xl">JK</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (requireAdmin && !user?.isAdmin) {
    return null; // Will redirect via useEffect
  }

  // Check if JKAP membership is required but user is external commissioner
  if (requireJkapMember && user?.userType === 'external_commissioner') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-jkap-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-jkap-red-500" />
            </div>
            <CardTitle>JKAP Members Only</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This area is exclusively for JKAP Memorial League members. 
              As an external commissioner, you have access to all our League Tools.
            </p>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-foreground">Your Access</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You have full access to: Injured List Manager, Game Recap Creator, Draft Board, and all league management tools.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/tools">
                <Button variant="primary" fullWidth>
                  Go to League Tools
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" fullWidth>
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;


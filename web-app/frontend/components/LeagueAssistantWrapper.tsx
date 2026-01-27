'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';

// Dynamically import the assistant to avoid SSR issues
const LeagueAssistant = dynamic(() => import('./LeagueAssistant'), { ssr: false });

export default function LeagueAssistantWrapper() {
  const { isAuthenticated, user } = useAuth();
  
  // Only show assistant for authenticated JKAP members
  if (!isAuthenticated || !user) return null;
  if (user.userType === 'external_commissioner') return null;
  
  return <LeagueAssistant />;
}

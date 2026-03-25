import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PUBLISHED_DRAFT_META } from '@/lib/data/published-season-draft';

export const metadata: Metadata = {
  title: `Draft Results | ${PUBLISHED_DRAFT_META.seasonLabel} | JKAP`,
  description: 'Official published draft results for the JKAP Memorial League.',
};

export default function DraftResultsLayout({ children }: { children: ReactNode }) {
  return children;
}

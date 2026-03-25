/**
 * Member-facing UI rules driven by season_state.phase (SeasonPhase).
 */

import type { SeasonPhase } from '@/types/offseason';

/** Show free-agent ticker only while these league phases are active */
const FREE_AGENT_TICKER_PHASES: SeasonPhase[] = [
  'free_agent_declaration',
  'world_series',
  'claiming_period',
  'claim_resolution',
  'draft_prep',
  'draft',
  'roster_finalization',
];

const DEFAULT_STALE_NOTIFICATION_IDS = new Set([
  'claiming-period-open-2024',
  'fa-declaration-guide-2024',
]);

export function shouldShowFreeAgentTicker(phase: SeasonPhase | null | undefined): boolean {
  if (!phase) return false;
  return FREE_AGENT_TICKER_PHASES.includes(phase);
}

/** Hide static / fallback offseason promos once we're in spring training or the regular season */
export function filterNotificationsForSeasonPhase<T extends { id: string; title: string; content: string }>(
  notifications: T[],
  phase: SeasonPhase | null | undefined
): T[] {
  if (phase !== 'spring_training' && phase !== 'regular_season') {
    return notifications;
  }
  return notifications.filter((n) => {
    if (DEFAULT_STALE_NOTIFICATION_IDS.has(n.id)) return false;
    const blob = `${n.title} ${n.content}`.toLowerCase();
    if (
      blob.includes('claiming period') ||
      blob.includes('submit your claim') ||
      blob.includes('declare free') ||
      blob.includes('free agent declaration') ||
      blob.includes('dfa your players')
    ) {
      return false;
    }
    return true;
  });
}

export function hideOffseasonTaskWidget(phase: SeasonPhase | null | undefined): boolean {
  return phase === 'spring_training' || phase === 'regular_season';
}

export function formatCountdownMs(ms: number): string {
  if (ms <= 0) return '0h 0m 0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

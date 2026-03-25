'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  PUBLISHED_DRAFT_META,
  PUBLISHED_DRAFT_RESULTS,
  draftedByAbbrev,
} from '@/lib/data/published-season-draft';
import { ClipboardList, Search } from 'lucide-react';

/** Embedded in Off-Season → Draft for league members (no live draft board). */
export function MemberDraftResultsPanel() {
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const abbrevOptions = useMemo(() => {
    const set = new Set<string>();
    PUBLISHED_DRAFT_RESULTS.forEach((r) => set.add(draftedByAbbrev(r)));
    return ['all', ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PUBLISHED_DRAFT_RESULTS.filter((row) => {
      if (teamFilter !== 'all' && draftedByAbbrev(row) !== teamFilter) return false;
      if (!q) return true;
      return (
        row.playerName.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.draftedBy.toLowerCase().includes(q)
      );
    });
  }, [teamFilter, query]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            {PUBLISHED_DRAFT_META.seasonLabel}
          </Badge>
          <Badge variant="default" className="text-slate-400 border-slate-600">
            {PUBLISHED_DRAFT_META.resultsPostedLabel}
          </Badge>
        </div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-emerald-400" />
          Draft results
        </h2>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl">
          Official picks from the league draft. Filter by your team abbreviation or search for a player.
        </p>
      </div>

      <Card className="bg-slate-900/40 border-slate-700">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="search"
              placeholder="Search player, position, team…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/80 border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-56">
            <label htmlFor="member-draft-team-filter" className="text-sm text-slate-400 whitespace-nowrap">
              Team
            </label>
            <select
              id="member-draft-team-filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="flex-1 rounded-lg bg-slate-800/80 border border-slate-600 text-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              {abbrevOptions.map((abbr) => (
                <option key={abbr} value={abbr}>
                  {abbr === 'all' ? 'All teams' : abbr}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-left">
                <th className="px-4 py-3 font-semibold text-slate-200 w-14">#</th>
                <th className="px-4 py-3 font-semibold text-slate-200 min-w-[160px]">Player</th>
                <th className="px-4 py-3 font-semibold text-slate-200 w-20">Pos</th>
                <th className="px-4 py-3 font-semibold text-slate-200 w-16">OVR</th>
                <th className="px-4 py-3 font-semibold text-slate-200 min-w-[220px]">Drafted by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/80">
              {filtered.map((row) => (
                <tr key={row.pick} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">{row.pick}</td>
                  <td className="px-4 py-3 font-medium text-white">{row.playerName}</td>
                  <td className="px-4 py-3 text-slate-400">{row.position}</td>
                  <td className="px-4 py-3 font-display text-amber-200">{row.ovr}</td>
                  <td className="px-4 py-3 text-slate-400">{row.draftedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-slate-500 py-12 px-4">No picks match your filters.</p>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Data is updated in{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">lib/data/published-season-draft.ts</code>
        .
      </p>
    </div>
  );
}

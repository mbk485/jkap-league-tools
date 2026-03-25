'use client';

import { useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  PUBLISHED_DRAFT_META,
  PUBLISHED_DRAFT_RESULTS,
  draftedByAbbrev,
} from '@/lib/data/published-season-draft';
import { ArrowLeft, ClipboardList, Search } from 'lucide-react';

export default function PublishedDraftResultsPage() {
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
              {PUBLISHED_DRAFT_META.seasonLabel}
            </Badge>
            <Badge variant="default" className="text-muted-foreground">
              {PUBLISHED_DRAFT_META.resultsPostedLabel}
            </Badge>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500 shrink-0" />
            Draft results
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Every pick from the published results sheet. Filter by team abbreviation or search players.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Button as="link" href="/draft/order" variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Draft order
          </Button>
          <Button as="link" href="/draft" variant="secondary">
            Live draft board
          </Button>
        </div>

        <Card className="border-border bg-card/50 mb-6">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search player, position, team…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-56">
              <label htmlFor="team-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                Team
              </label>
              <select
                id="team-filter"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="flex-1 rounded-lg bg-background border border-border text-foreground py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
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

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-left">
                  <th className="px-4 py-3 font-semibold text-foreground w-14">#</th>
                  <th className="px-4 py-3 font-semibold text-foreground min-w-[160px]">Player</th>
                  <th className="px-4 py-3 font-semibold text-foreground w-20">Pos</th>
                  <th className="px-4 py-3 font-semibold text-foreground w-16">OVR</th>
                  <th className="px-4 py-3 font-semibold text-foreground min-w-[220px]">Drafted by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.pick} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{row.pick}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.playerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.position}</td>
                    <td className="px-4 py-3 font-display text-foreground">{row.ovr}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.draftedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12 px-4">No picks match your filters.</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Commissioners update this table in{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">lib/data/published-season-draft.ts</code>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}

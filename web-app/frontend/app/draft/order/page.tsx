import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  PUBLISHED_DRAFT_META,
  PUBLISHED_DRAFT_ORDER,
} from '@/lib/data/published-season-draft';
import { ArrowRight, ClipboardList, ListOrdered } from 'lucide-react';

export const metadata: Metadata = {
  title: `Draft Order | ${PUBLISHED_DRAFT_META.seasonLabel} | JKAP`,
  description: 'Official published draft order for the JKAP Memorial League.',
};

export default function PublishedDraftOrderPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">
              {PUBLISHED_DRAFT_META.seasonLabel}
            </Badge>
            <Badge variant="default" className="text-muted-foreground">
              {PUBLISHED_DRAFT_META.orderPostedLabel}
            </Badge>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <ListOrdered className="w-8 h-8 sm:w-10 sm:h-10 text-jkap-red-500 shrink-0" />
            Published draft order
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Official pick order as released by the league. Trade notes show the original slot holder when
            a pick was acquired via trade.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Button as="link" href="/draft/results" className="bg-jkap-red-600 hover:bg-jkap-red-500">
            <ClipboardList className="w-4 h-4 mr-2" />
            Draft results
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button as="link" href="/draft" variant="secondary">
            Live draft board
          </Button>
          <Button as="link" href="/offseason?tab=draft" variant="secondary">
            Off-season hub
          </Button>
        </div>

        <Card className="border-border bg-card/50">
          <CardContent className="p-0 sm:p-0">
            <ul className="divide-y divide-border">
              {PUBLISHED_DRAFT_ORDER.map((row) => (
                <li
                  key={`${row.pick}-${row.abbreviation}-${row.via ?? ''}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-display text-lg text-foreground shrink-0">
                      {row.pick}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        <span className="text-jkap-red-400 font-mono text-sm mr-2">{row.abbreviation}</span>
                        {row.teamName}
                      </p>
                      {row.via ? (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          via {row.via}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Commissioners update this list in{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">lib/data/published-season-draft.ts</code>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sun, Clock, Shirt, MapPin, ArrowRightLeft, Gamepad2 } from 'lucide-react';
import { formatCountdownMs } from '@/lib/season-phase-ui';

export interface SpringTrainingBannerProps {
  phaseDeadline: string | null | undefined;
  phaseStartedAt: string | null | undefined;
  /** Games logged since phase start (client-computed) */
  springGamesPlayed?: number;
  compact?: boolean;
}

export function SpringTrainingBanner({
  phaseDeadline,
  phaseStartedAt,
  springGamesPlayed = 0,
  compact = false,
}: SpringTrainingBannerProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseDeadline) {
      setRemainingMs(null);
      return;
    }
    const end = new Date(phaseDeadline).getTime();
    const tick = () => setRemainingMs(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseDeadline]);

  const gamesLeft = Math.max(0, 3 - springGamesPlayed);
  const countdownLabel =
    remainingMs === null ? '—' : remainingMs <= 0 ? 'Window ended' : formatCountdownMs(remainingMs);

  if (compact) {
    return (
      <Card className="mb-6 border-sky-500/40 bg-gradient-to-r from-sky-500/10 to-emerald-500/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-500/20">
                <Sun className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground">Spring Training</h2>
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Trading window: <strong className="text-foreground">48 hours</strong> or{' '}
                  <strong className="text-foreground">3 games</strong> logged (whichever comes first). Trades still
                  require commissioner approval. Use <strong className="text-foreground">T&WR</strong> on Discord for
                  trade posts and rules.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <div className="px-3 py-2 rounded-lg bg-card border border-border text-center min-w-[7rem]">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> 48h window
                </p>
                <p className="text-lg font-mono font-bold text-sky-400 tabular-nums">{countdownLabel}</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-card border border-border text-center min-w-[7rem]">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
                  <Gamepad2 className="w-3 h-3" /> ST games
                </p>
                <p className="text-lg font-bold text-foreground">
                  {springGamesPlayed}/3
                </p>
                {gamesLeft > 0 && (
                  <p className="text-[10px] text-muted-foreground">{gamesLeft} left</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-sky-500/40 bg-gradient-to-br from-sky-500/10 via-card to-emerald-500/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-sky-500/20">
            <Sun className="w-7 h-7 text-sky-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
              Spring Training
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40">Active</Badge>
            </h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
              Play <strong className="text-foreground">three</strong> spring training games before the regular season.
              The trading window stays open for <strong className="text-foreground">48 hours from league start</strong>{' '}
              or until those three games are finished—whichever happens first. There is no trade limit during this
              window; all trades still need commissioner approval.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex gap-3 p-4 rounded-xl bg-muted/40 border border-border">
            <Shirt className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Uniforms</p>
              <p className="text-sm text-muted-foreground">
                Use <strong className="text-foreground">spring training</strong> or{' '}
                <strong className="text-foreground">alternate</strong> jerseys.
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-4 rounded-xl bg-muted/40 border border-border">
            <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Stadiums</p>
              <p className="text-sm text-muted-foreground">
                Games must be played in <strong className="text-foreground">spring training</strong> or{' '}
                <strong className="text-foreground">minor league</strong> stadiums.
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-4 rounded-xl bg-muted/40 border border-border sm:col-span-2">
            <ArrowRightLeft className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Trading</p>
              <p className="text-sm text-muted-foreground">
                Unlimited trades during the window (commissioner approval required). Window ends after 3 ST games or 48
                hours. Post in <strong className="text-foreground">T&WR</strong> (Trades, Waivers & Rules).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
          <div className="px-4 py-3 rounded-xl bg-card border border-sky-500/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time remaining (48h window)
            </p>
            <p className="text-2xl font-mono font-bold text-sky-400 tabular-nums">{countdownLabel}</p>
            {phaseStartedAt && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Started {new Date(phaseStartedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="px-4 py-3 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Spring games logged (you)</p>
            <p className="text-2xl font-bold text-foreground">
              {springGamesPlayed} / 3
            </p>
            {gamesLeft > 0 && (
              <p className="text-sm text-muted-foreground">{gamesLeft} more to complete ST</p>
            )}
          </div>
          <Button as="link" href="/tools/game-logger" variant="primary" icon={<Gamepad2 className="w-4 h-4" />}>
            Log a spring training game
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

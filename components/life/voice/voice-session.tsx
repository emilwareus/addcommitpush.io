'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Check, Clock3, Hand, Loader2, Mic, MicOff, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TURN_PACINGS, type TurnPacing } from './realtime-events';
import {
  useRealtimeVoiceSession,
  type VoiceActivity,
  type VoicePhase,
} from './use-realtime-voice-session';
import { VoiceOrb } from './voice-orb';
import type { ProvisionalInputView, VoiceTurnView } from './realtime-turn-assembler';

/** Phases that describe themselves; the rest are described by the activity. */
const TRANSITION_LABELS: Partial<Record<VoicePhase, string>> = {
  requesting_microphone: 'Opening microphone',
  creating_session: 'Starting conversation',
  connecting: 'Connecting',
  closing: 'Saving conversation',
  closed: 'Conversation saved',
  error: 'Voice unavailable',
};

const ACTIVITY_LABELS: Record<VoiceActivity, string> = {
  idle: 'Ready when you are',
  listening: 'Listening',
  user_speaking: 'Hearing you',
  thinking: 'Thinking',
  assistant_speaking: 'Life is speaking',
};

/**
 * How long semantic turn detection tolerates a pause before it answers.
 * `low` allows 8 seconds, `medium` 4, `high` 2.
 */
const PACING_LABELS: Record<TurnPacing, string> = {
  low: 'Unhurried',
  medium: 'Balanced',
  high: 'Quick',
};

const PACING_HINTS: Record<TurnPacing, string> = {
  low: 'Life waits through long pauses before it answers.',
  medium: 'Life answers after a natural pause.',
  high: 'Life answers as soon as you stop.',
};

export function VoiceSession({ defaultTitle }: { defaultTitle: string }) {
  const {
    phase,
    error,
    session,
    snapshot,
    muted,
    activity,
    activeToolCount,
    elapsedSeconds,
    secondsRemaining,
    turnPacing,
    turnPacingPending,
    remoteAudioRef,
    levelMeterRef,
    start,
    toggleMute,
    interrupt,
    changeTurnPacing,
    retryCommit,
    end,
  } = useRealtimeVoiceSession();

  const canStart = ['idle', 'closed'].includes(phase) || (phase === 'error' && !session);
  const connected = phase === 'connected';
  const connecting = ['requesting_microphone', 'creating_session', 'connecting'].includes(phase);
  const savingTurn = snapshot.turns.some((turn) => turn.commitStatus === 'committing');
  const hasPendingWork = activeToolCount > 0 || savingTurn;
  // `idle` and `connected` have no fixed label: the activity describes them.
  const status =
    TRANSITION_LABELS[phase] ??
    (activeToolCount > 0
      ? 'Working with your memories'
      : savingTurn
        ? 'Saving conversation turn'
        : connected && muted
          ? 'Microphone muted'
          : ACTIVITY_LABELS[activity]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <audio ref={remoteAudioRef} autoPlay className="sr-only" aria-label="Life voice audio" />

      <section className="border border-dashed border-border bg-card px-6 py-10 text-center sm:px-10">
        <VoiceOrb activity={connected ? activity : 'idle'} meterRef={levelMeterRef}>
          {connecting || phase === 'closing' || hasPendingWork ? (
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          ) : muted ? (
            <MicOff className="size-8 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Mic className="size-8 text-primary" aria-hidden="true" />
          )}
        </VoiceOrb>

        <p className="mt-6 font-serif text-3xl font-semibold text-primary" aria-live="polite">
          {status}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Life listens, asks one question at a time, records memories you share, and looks through
          your history when it helps the conversation. Speak over it whenever you want.
        </p>

        {session && (
          <p className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" aria-hidden="true" /> {formatElapsed(elapsedSeconds)}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {canStart ? (
            <Button type="button" size="lg" onClick={() => void start({ title: defaultTitle })}>
              <Mic aria-hidden="true" /> Start talking
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={toggleMute} disabled={!connected}>
                {muted ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
                {muted ? 'Unmute' : 'Mute'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={interrupt}
                disabled={activity !== 'assistant_speaking'}
              >
                <Hand aria-hidden="true" /> Interrupt
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void end()}
                disabled={!session || !['connected', 'error'].includes(phase) || hasPendingWork}
              >
                <Square aria-hidden="true" /> End
              </Button>
            </>
          )}
        </div>

        {connected && (
          <div className="mt-7 border-t border-dashed border-border pt-6">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Turn taking
            </p>
            <div
              role="radiogroup"
              aria-label="How long Life waits before answering"
              className="mt-3 flex justify-center gap-2"
            >
              {TURN_PACINGS.map((pacing) => (
                <Button
                  key={pacing}
                  type="button"
                  role="radio"
                  aria-checked={turnPacing === pacing}
                  size="sm"
                  variant={turnPacing === pacing ? 'default' : 'outline'}
                  disabled={turnPacingPending}
                  onClick={() => changeTurnPacing(pacing)}
                >
                  {PACING_LABELS[pacing]}
                </Button>
              ))}
            </div>
            {turnPacing && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {PACING_HINTS[turnPacing]}
              </p>
            )}
          </div>
        )}

        {secondsRemaining !== null && (
          <p
            className="mx-auto mt-6 max-w-xl text-sm leading-6 text-muted-foreground"
            role="status"
          >
            This session ends in {formatElapsed(secondsRemaining)}. Everything saved so far stays in
            your conversation.
          </p>
        )}

        {error && (
          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-danger" role="alert">
            {error}
          </p>
        )}

        {phase === 'closed' && session && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-success">
            <Check className="size-4" aria-hidden="true" />
            <Link href={`/life/conversations/${session.conversationId}`} prefetch={false}>
              Open saved conversation
            </Link>
          </p>
        )}
      </section>

      <section className="border border-dashed border-border bg-background p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
          <h2 className="font-serif text-2xl font-semibold text-primary">Conversation</h2>
          <Badge variant="outline">Live transcript</Badge>
        </div>
        <Transcript
          turns={snapshot.turns}
          provisionalInputs={snapshot.provisionalInputs}
          connected={connected}
          {...(connected ? { onRetry: retryCommit } : {})}
        />
      </section>
    </div>
  );
}

function Transcript({
  turns,
  provisionalInputs,
  connected,
  onRetry,
}: {
  turns: readonly VoiceTurnView[];
  provisionalInputs: readonly ProvisionalInputView[];
  connected: boolean;
  onRetry?: (responseId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  // The snapshot allocates fresh arrays on every Realtime event, so the effect
  // keys off a cheap signature and defers the layout read to one frame.
  const growth = `${turns.length}:${turns.at(-1)?.assistantTranscript.length ?? 0}:${
    provisionalInputs.length
  }:${provisionalInputs.at(-1)?.transcript.length ?? 0}`;

  useEffect(() => {
    if (!pinnedToBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [growth]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        pinnedToBottomRef.current = scrollHeight - scrollTop - clientHeight < 48;
      }}
      className="mt-5 max-h-[28rem] min-h-72 space-y-4 overflow-y-auto pr-1"
      aria-live="polite"
    >
      {turns.map((turn) => (
        <article key={turn.responseId} className="space-y-3">
          {turn.userTranscript && <TranscriptBubble role="You" text={turn.userTranscript} />}
          <TranscriptBubble role="Life" text={turn.assistantTranscript} />
          <div className="flex items-center justify-end gap-3">
            <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {turn.commitStatus === 'saved' ? 'Saved' : turn.commitStatus.replace('_', ' ')}
            </span>
            {turn.retryable && onRetry && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onRetry(turn.responseId)}
              >
                Retry save
              </Button>
            )}
          </div>
          {turn.commitError && (
            <p className="text-right text-xs leading-5 text-danger">{turn.commitError}</p>
          )}
        </article>
      ))}
      {provisionalInputs.map((input) => (
        <TranscriptBubble key={input.itemId} role="You" text={input.transcript} />
      ))}
      {turns.length === 0 && provisionalInputs.length === 0 && (
        <p className="py-14 text-center text-sm text-muted-foreground">
          {connected ? 'Start speaking when you are ready.' : 'Your conversation appears here.'}
        </p>
      )}
    </div>
  );
}

function TranscriptBubble({ role, text }: { role: 'You' | 'Life'; text: string }) {
  return (
    <div
      className={`max-w-[90%] border border-dashed p-4 ${
        role === 'Life' ? 'ml-auto border-primary bg-card' : 'border-border bg-background'
      }`}
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{role}</p>
      <p className="text-sm leading-6">{text}</p>
    </div>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

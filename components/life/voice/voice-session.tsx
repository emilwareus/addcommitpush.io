'use client';

import Link from 'next/link';
import { Check, Clock3, Loader2, Mic, MicOff, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealtimeVoiceSession, type VoicePhase } from './use-realtime-voice-session';

const PHASE_LABELS: Record<VoicePhase, string> = {
  idle: 'Ready when you are',
  requesting_microphone: 'Opening microphone',
  creating_session: 'Starting conversation',
  connecting: 'Connecting',
  connected: 'Listening',
  closing: 'Saving conversation',
  closed: 'Conversation saved',
  error: 'Voice unavailable',
};

export function VoiceSession({ defaultTitle }: { defaultTitle: string }) {
  const {
    phase,
    error,
    session,
    snapshot,
    muted,
    isSpeaking,
    activeToolCount,
    elapsedSeconds,
    remoteAudioRef,
    start,
    toggleMute,
    end,
  } = useRealtimeVoiceSession();
  const canStart = ['idle', 'closed'].includes(phase) || (phase === 'error' && !session);
  const connected = phase === 'connected';
  const busy = ['requesting_microphone', 'creating_session', 'connecting', 'closing'].includes(
    phase
  );
  const savingTurn = snapshot.turns.some((turn) => turn.commitStatus === 'committing');
  const hasPendingWork = activeToolCount > 0 || savingTurn;
  const status = activeToolCount
    ? 'Working with your memories'
    : savingTurn
      ? 'Saving conversation turn'
      : isSpeaking
        ? 'Life is speaking'
        : connected && muted
          ? 'Microphone muted'
          : PHASE_LABELS[phase];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <audio ref={remoteAudioRef} autoPlay className="sr-only" aria-label="Life voice audio" />

      <section className="border border-dashed border-border bg-card px-6 py-10 text-center sm:px-10">
        <div
          className={`mx-auto grid size-24 place-items-center rounded-full border ${
            connected && !muted
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-primary'
          }`}
        >
          {busy || hasPendingWork ? (
            <Loader2 className="size-9 animate-spin" aria-hidden="true" />
          ) : muted ? (
            <MicOff className="size-9" aria-hidden="true" />
          ) : (
            <Mic className="size-9" aria-hidden="true" />
          )}
        </div>
        <p className="mt-6 font-serif text-3xl font-semibold text-primary" aria-live="polite">
          {status}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Life listens, asks one question at a time, records memories you share, and looks through
          your history when it helps the conversation.
        </p>

        {session && (
          <p className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" aria-hidden="true" /> {formatElapsed(elapsedSeconds)}
          </p>
        )}

        <div className="mt-7 flex justify-center gap-3">
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
                variant="destructive"
                onClick={() => void end()}
                disabled={!session || !['connected', 'error'].includes(phase) || hasPendingWork}
              >
                <Square aria-hidden="true" /> End
              </Button>
            </>
          )}
        </div>

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

      <section className="min-h-72 border border-dashed border-border bg-background p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
          <h2 className="font-serif text-2xl font-semibold text-primary">Conversation</h2>
          <Badge variant="outline">Live transcript</Badge>
        </div>
        <div className="mt-5 space-y-4" aria-live="polite">
          {snapshot.turns.map((turn) => (
            <article key={turn.responseId} className="space-y-3">
              {turn.userTranscript && <TranscriptBubble role="You" text={turn.userTranscript} />}
              <TranscriptBubble role="Life" text={turn.assistantTranscript} />
              <p className="text-right text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                {turn.commitStatus === 'saved' ? 'Saved' : turn.commitStatus.replace('_', ' ')}
              </p>
              {turn.commitError && (
                <p className="text-right text-xs leading-5 text-danger">{turn.commitError}</p>
              )}
            </article>
          ))}
          {snapshot.provisionalInputs.map((input) => (
            <TranscriptBubble key={input.itemId} role="You" text={input.transcript} />
          ))}
          {snapshot.turns.length === 0 && snapshot.provisionalInputs.length === 0 && (
            <p className="py-14 text-center text-sm text-muted-foreground">
              {connected ? 'Start speaking when you are ready.' : 'Your conversation appears here.'}
            </p>
          )}
        </div>
      </section>
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

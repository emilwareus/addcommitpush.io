'use client';

import Link from 'next/link';
import { Check, Clock3, Headphones, Loader2, Mic, MicOff, RotateCcw, Square } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SENSITIVITIES } from '@/lib/life/constants';
import { useRealtimeVoiceSession, type VoicePhase } from './use-realtime-voice-session';

type Sensitivity = (typeof SENSITIVITIES)[number];

const PHASE_LABELS: Record<VoicePhase, string> = {
  idle: 'Idle',
  requesting_microphone: 'Requesting microphone',
  creating_session: 'Creating Life session',
  connecting: 'Connecting to voice',
  connected: 'Connected',
  closing: 'Closing',
  closed: 'Closed',
  error: 'Error',
};

export function VoiceSession({ defaultTitle }: { defaultTitle: string }) {
  const {
    phase,
    error,
    controlError,
    session,
    snapshot,
    muted,
    isSpeaking,
    toolSearchCount,
    elapsedSeconds,
    devices,
    selectedDeviceId,
    remoteAudioRef,
    start,
    toggleMute,
    changeInputDevice,
    retryCommit,
    end,
  } = useRealtimeVoiceSession();
  const [title, setTitle] = useState(defaultTitle);
  const [sensitivities, setSensitivities] = useState<Sensitivity[]>(['standard', 'private']);
  const [setupError, setSetupError] = useState<string | null>(null);
  const canStart = ['idle', 'closed'].includes(phase) || (phase === 'error' && !session);
  const setupLocked = !canStart;

  function toggleSensitivity(sensitivity: Sensitivity) {
    if (setupLocked) return;
    setSensitivities((current) =>
      current.includes(sensitivity)
        ? current.filter((candidate) => candidate !== sensitivity)
        : SENSITIVITIES.filter(
            (candidate) => candidate === sensitivity || current.includes(candidate)
          )
    );
  }

  function startSession() {
    setSetupError(null);
    if (title.trim().length === 0) {
      setSetupError('Enter a title for this durable conversation.');
      return;
    }
    if (sensitivities.length === 0) {
      setSetupError('Select at least one sensitivity level.');
      return;
    }
    void start({ title: title.trim(), sensitivities });
  }

  const connected = phase === 'connected';
  const saving = snapshot.turns.some((turn) => turn.commitStatus === 'committing');
  const activeStatus = toolSearchCount
    ? 'Searching memory'
    : saving
      ? 'Saving turn'
      : isSpeaking
        ? 'Life is speaking'
        : connected
          ? muted
            ? 'Microphone muted'
            : 'Listening'
          : PHASE_LABELS[phase];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
      <audio ref={remoteAudioRef} autoPlay className="sr-only" aria-label="Life voice audio" />

      <div className="space-y-6">
        <section
          className="border border-dashed border-border bg-card p-5"
          aria-labelledby="setup-title"
        >
          <p className="section-kicker">Session setup</p>
          <h2 id="setup-title" className="mt-2 font-serif text-2xl font-semibold">
            Conversation boundary
          </h2>
          <label
            className="mt-5 block text-xs font-medium uppercase tracking-[0.1em]"
            htmlFor="voice-title"
          >
            Title
          </label>
          <input
            id="voice-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={setupLocked}
            maxLength={300}
            className="mt-2 h-10 w-full border border-dashed border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
          />

          <fieldset className="mt-6" disabled={setupLocked}>
            <legend className="text-xs font-medium uppercase tracking-[0.1em]">Sensitivity</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SENSITIVITIES.map((sensitivity) => {
                const checked = sensitivities.includes(sensitivity);
                return (
                  <label
                    key={sensitivity}
                    className="flex cursor-pointer items-center gap-2 border border-dashed border-border bg-background px-3 py-2 text-xs capitalize has-disabled:cursor-not-allowed has-disabled:opacity-60"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSensitivity(sensitivity)}
                      className="size-4 accent-primary"
                    />
                    {sensitivity}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Standard and private are selected by default. Intimate and restricted access must be
            selected explicitly and cannot change after this session starts.
          </p>

          <label
            className="mt-5 block text-xs font-medium uppercase tracking-[0.1em]"
            htmlFor="voice-device"
          >
            Microphone
          </label>
          <select
            id="voice-device"
            value={selectedDeviceId}
            onChange={(event) => void changeInputDevice(event.target.value)}
            disabled={devices.length === 0 || phase === 'closing'}
            className="mt-2 h-10 w-full border border-dashed border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
          >
            <option value="">System default microphone</option>
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Permission is requested only when you press Start. Device names appear after permission.
          </p>

          {setupError && (
            <p className="mt-4 text-sm text-danger" role="alert">
              {setupError}
            </p>
          )}
          <div className="mt-5">
            <Button type="button" onClick={startSession} disabled={!canStart} className="w-full">
              {setupLocked && phase !== 'connected' ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Mic aria-hidden="true" />
              )}
              Start
            </Button>
          </div>
        </section>

        <section className="border border-dashed border-border p-5" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Voice status</p>
              <p className="mt-2 font-serif text-2xl font-semibold">{activeStatus}</p>
            </div>
            <Badge variant={phase === 'error' ? 'destructive' : 'outline'}>
              {PHASE_LABELS[phase]}
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" aria-hidden="true" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>
          {session && (
            <div className="mt-4 flex flex-wrap gap-2">
              {session.allowedSensitivities.map((sensitivity) => (
                <Badge key={sensitivity} variant="outline" className="capitalize">
                  {sensitivity}
                </Badge>
              ))}
            </div>
          )}
          {toolSearchCount > 0 && (
            <p className="mt-4 flex items-center gap-2 text-xs text-info">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Searching Life memory for {toolSearchCount}{' '}
              {toolSearchCount === 1 ? 'tool call' : 'tool calls'}…
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={toggleMute} disabled={!connected}>
              {muted ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
              {muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void end()}
              disabled={!session || !['connected', 'error'].includes(phase)}
            >
              <Square aria-hidden="true" /> End
            </Button>
          </div>
        </section>

        {(error || controlError) && (
          <section
            className="border border-dashed border-danger bg-destructive/10 p-5"
            role="alert"
          >
            <p className="section-kicker text-danger">Voice error</p>
            <p className="mt-3 text-sm leading-6">{error ?? controlError}</p>
            {session && phase === 'error' && (
              <p className="mt-3 text-xs text-muted-foreground">
                Use End to request an acknowledged backend close. Uncommitted turns remain visible
                below and can still be retried while the Life session is active.
              </p>
            )}
          </section>
        )}

        {phase === 'closed' && session && (
          <section className="border border-dashed border-success bg-card p-5">
            <p className="flex items-center gap-2 text-sm text-success">
              <Check className="size-4" aria-hidden="true" /> Life acknowledged the session close.
            </p>
            <Button asChild variant="link" className="mt-2 px-0">
              <Link href={`/life/conversations/${session.conversationId}`} prefetch={false}>
                Open durable transcript
              </Link>
            </Button>
          </section>
        )}
      </div>

      <section
        className="min-h-[36rem] border border-dashed border-border bg-background p-5 sm:p-7"
        aria-labelledby="transcript-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-5">
          <div>
            <p className="section-kicker">Live transcript</p>
            <h2 id="transcript-title" className="mt-2 font-serif text-3xl font-semibold">
              This conversation
            </h2>
          </div>
          <Headphones className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="mt-6 space-y-5" aria-live="polite">
          {snapshot.turns.map((turn) => (
            <article key={turn.responseId} className="space-y-3">
              {turn.userTranscript && (
                <TranscriptBubble role="You" text={turn.userTranscript} partial={false} />
              )}
              <TranscriptBubble
                role="Life"
                text={turn.assistantTranscript}
                partial={turn.assistantIsPartial}
              />
              <div className="ml-auto flex max-w-[90%] flex-wrap items-center justify-end gap-2 text-[10px] uppercase tracking-[0.1em]">
                <CommitBadge status={turn.commitStatus} />
                {turn.citedMemoryIds.length > 0 && (
                  <span className="text-muted-foreground">
                    {turn.citedMemoryIds.length} cited{' '}
                    {turn.citedMemoryIds.length === 1 ? 'memory' : 'memories'}
                  </span>
                )}
                {turn.commitStatus === 'not_saved' && turn.providerStatus === 'completed' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => retryCommit(turn.responseId)}
                  >
                    <RotateCcw aria-hidden="true" /> Retry save
                  </Button>
                )}
              </div>
              {turn.commitError && (
                <p className="ml-auto max-w-[90%] text-right text-xs leading-5 text-danger">
                  {turn.commitError}
                </p>
              )}
            </article>
          ))}

          {snapshot.provisionalInputs.map((input) => (
            <TranscriptBubble
              key={input.itemId}
              role="You"
              text={input.transcript}
              partial={!input.complete}
            />
          ))}

          {snapshot.turns.length === 0 && snapshot.provisionalInputs.length === 0 && (
            <p className="py-20 text-center text-sm leading-6 text-muted-foreground">
              {connected
                ? 'The microphone is live. Start speaking when you are ready.'
                : 'Completed and provisional speech will appear here after the session connects.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function TranscriptBubble({
  role,
  text,
  partial,
}: {
  role: string;
  text: string;
  partial: boolean;
}) {
  return (
    <div
      className={`max-w-[90%] border border-dashed p-4 ${role === 'Life' ? 'ml-auto border-primary bg-card' : 'border-border bg-background'}`}
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {role} · {partial ? 'provisional' : 'complete'}
      </p>
      <p className={partial ? 'text-sm italic text-muted-foreground' : 'text-sm leading-6'}>
        {text}
      </p>
    </div>
  );
}

function CommitBadge({
  status,
}: {
  status: 'speaking' | 'committing' | 'saved' | 'not_saved' | 'conflict';
}) {
  const label = {
    speaking: 'Speaking',
    committing: 'Saving',
    saved: 'Saved',
    not_saved: 'Not saved',
    conflict: 'Conflict',
  }[status];
  return (
    <Badge variant={status === 'not_saved' || status === 'conflict' ? 'destructive' : 'outline'}>
      {label}
    </Badge>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

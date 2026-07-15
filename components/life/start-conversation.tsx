'use client';

import { Keyboard, Mic, MessagesSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { conversationSchema } from '@/lib/life/contracts';

export function StartConversation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTextConversation() {
    setPending(true);
    setError(null);
    const response = await fetch('/api/life/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'conversation', title: 'New conversation' }),
    });
    if (!response.ok) {
      setError('The conversation could not be started.');
      setPending(false);
      return;
    }
    const conversation = conversationSchema.safeParse(await response.json());
    if (!conversation.success) {
      setError('Life returned an invalid conversation response.');
      setPending(false);
      return;
    }
    router.push(`/life/conversations/${conversation.data.id}`);
  }

  return (
    <section className="border border-dashed border-primary bg-primary p-6 text-primary-foreground lg:col-span-2">
      <p className="text-[10px] uppercase tracking-[0.18em] opacity-75">Start a conversation</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold">Talk with Life</h2>
      <p className="mt-3 max-w-2xl text-sm opacity-80">
        Text is available now. Realtime voice and guided interviews arrive in their dedicated
        phases.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled title="Realtime voice is Phase 3">
          <Mic aria-hidden="true" /> Voice
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={startTextConversation}
          disabled={pending}
          className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
        >
          <Keyboard aria-hidden="true" /> {pending ? 'Starting…' : 'Text'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled
          title="Interviews are a later phase"
          className="text-primary-foreground"
        >
          <MessagesSquare aria-hidden="true" /> Interview
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Keyboard, Mic, MessagesSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { conversationSchema, createInterviewResponseSchema } from '@/lib/life/contracts';

export function StartConversation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterview, setShowInterview] = useState(false);

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

  async function startInterview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/life/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: String(form.get('theme')), title: String(form.get('title')) }),
    });
    if (!response.ok) {
      setError('The interview could not be started.');
      setPending(false);
      return;
    }
    const parsed = createInterviewResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      setError('Life returned an invalid interview response.');
      setPending(false);
      return;
    }
    router.push(`/life/conversations/${parsed.data.conversation.id}`);
  }

  return (
    <section className="border border-dashed border-primary bg-primary p-6 text-primary-foreground lg:col-span-2">
      <p className="text-[10px] uppercase tracking-[0.18em] opacity-75">Start a conversation</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold">Talk with Life</h2>
      <p className="mt-3 max-w-2xl text-sm opacity-80">
        Start a low-latency voice session or continue with a durable text conversation.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild type="button" variant="secondary">
          <Link href="/life/voice" prefetch={false}>
            <Mic aria-hidden="true" /> Voice
          </Link>
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
          disabled={pending}
          onClick={() => setShowInterview((visible) => !visible)}
          className="text-primary-foreground"
        >
          <MessagesSquare aria-hidden="true" /> Interview
        </Button>
      </div>
      {showInterview && (
        <form
          onSubmit={startInterview}
          className="mt-5 grid gap-3 border border-dashed border-primary-foreground/50 p-4 sm:grid-cols-2"
        >
          <label className="text-xs">
            <span className="mb-2 block uppercase tracking-wider">Title</span>
            <input
              name="title"
              required
              defaultValue="Life interview"
              className="h-10 w-full border border-dashed border-primary-foreground/50 bg-transparent px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="mb-2 block uppercase tracking-wider">Theme</span>
            <input
              name="theme"
              required
              placeholder="A period, relationship, or decision"
              className="h-10 w-full border border-dashed border-primary-foreground/50 bg-transparent px-3 text-sm"
            />
          </label>
          <Button type="submit" variant="secondary" disabled={pending} className="sm:col-span-2">
            {pending ? 'Starting…' : 'Start themed interview'}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}

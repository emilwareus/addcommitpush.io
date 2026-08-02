'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  conversationTurnResponseSchema,
  type ConversationTurnResponse,
} from '@/lib/life/contracts';

export function ConversationComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversationTurnResponse | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/life/conversations/${conversationId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Life could not complete the turn.');
      const parsed = conversationTurnResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Life returned an invalid turn response.');
      setContent('');
      setResult(parsed.data);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Life could not complete the turn.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 border border-dashed border-border bg-card p-5">
      <label>
        <span className="section-kicker mb-2 block">New text turn</span>
        <Textarea
          required
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write to Life…"
        />
      </label>
      <div className="mt-5">
        <Button type="submit" disabled={pending}>
          <Send aria-hidden="true" />
          {pending ? 'Thinking…' : 'Send'}
        </Button>
      </div>
      {result && (
        <div className="mt-5 border-t border-dashed border-border pt-4" role="status">
          <p className="text-sm text-success">Turn saved.</p>
          {result.created_memories.length > 0 && (
            <div className="mt-3">
              <p className="section-kicker">Created memories</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {result.created_memories.map((memory) => (
                  <a key={memory.id} href={`/life/memories/${memory.id}`} className="text-xs">
                    {memory.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

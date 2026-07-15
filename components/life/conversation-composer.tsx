'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_SEARCH_SENSITIVITIES, SENSITIVITIES } from '@/lib/life/constants';
import {
  conversationTurnResponseSchema,
  type ConversationTurnResponse,
} from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';

export function ConversationComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [sensitivities, setSensitivities] = useState<string[]>([...DEFAULT_SEARCH_SENSITIVITIES]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversationTurnResponse | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sensitivities.length === 0) return setError('Select at least one sensitivity.');
    setPending(true);
    setError(null);
    setResult(null);
    const response = await fetch(`/api/life/conversations/${conversationId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sensitivities }),
    });
    if (!response.ok) {
      setPending(false);
      setError('Life could not complete the turn.');
      return;
    }
    const parsed = conversationTurnResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      setPending(false);
      setError('Life returned an invalid turn response.');
      return;
    }
    setContent('');
    setResult(parsed.data);
    setPending(false);
    router.refresh();
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
      <fieldset className="mt-4">
        <legend className="section-kicker">Retrieval sensitivity</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {SENSITIVITIES.map((value) => (
            <label key={value} className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={sensitivities.includes(value)}
                onChange={() =>
                  setSensitivities((current) =>
                    current.includes(value)
                      ? current.filter((item) => item !== value)
                      : [...current, value]
                  )
                }
              />
              {enumLabel(value)}
            </label>
          ))}
        </div>
      </fieldset>
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

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DataExport() {
  return (
    <section className="border border-dashed border-border bg-card p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-primary">Export your data</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        JSON contains the complete owner graph. Markdown contains every memory revision in a
        human-readable document. Downloads are generated on demand and are never cached by Life UI.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <a href="/api/life/export/json" download>
            <Download aria-hidden="true" /> Download JSON
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/life/export/markdown" download>
            <Download aria-hidden="true" /> Download Markdown
          </a>
        </Button>
      </div>
    </section>
  );
}

export function ResourcesSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <h2 className="text-6xl md:text-7xl font-bold mb-12 text-primary neon-glow">
        Questions?
      </h2>

      <div className="w-full max-w-2xl space-y-8">
        {/* Contact */}
        <div className="space-y-3 text-lg">
          <div className="flex items-center justify-center gap-3">
            <span className="text-muted-foreground">LinkedIn</span>
            <span className="text-foreground font-mono">linkedin.com/in/emilwareus</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-mono">emil@wareus.io</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-muted-foreground">Home address</span>
            <span className="text-foreground font-mono">0x7a3f9b2e</span>
          </div>
        </div>

        <div className="h-px w-full bg-primary/30" />

        {/* Presentation + blog */}
        <div className="space-y-3">
          <p className="text-xl text-foreground/80">
            Slides, code, and Jarvis source:
          </p>
          <p className="text-2xl font-mono font-bold text-primary">
            addcommitpush.io
          </p>
          <a
            href="https://github.com/emilwareus/addcommitpush.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-mono text-primary/80 hover:text-primary transition-colors underline"
          >
            github.com/emilwareus/addcommitpush.io
          </a>
        </div>
      </div>
    </div>
  );
}

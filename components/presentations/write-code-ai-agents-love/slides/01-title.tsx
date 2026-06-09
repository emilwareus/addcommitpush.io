import { SlideShell } from './shared';

export function TitleSlide() {
  return (
    <SlideShell>
      <h1 className="max-w-5xl text-center text-6xl font-bold leading-none tracking-tight text-primary neon-glow md:text-8xl">
        Write Code That AI Agents Love
      </h1>
      <p className="mt-10 text-xl text-muted-foreground">Emil Wåreus</p>
    </SlideShell>
  );
}

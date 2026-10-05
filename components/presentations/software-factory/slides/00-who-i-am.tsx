import Image from 'next/image';
import { Label, SlideFrame } from './shared';

interface ProjectPanel {
  name: string;
  role: string;
  descriptor?: string;
  site: string;
  src: string;
  alt: string;
  placement: string;
  imageSurface?: string;
  nameInLogo?: boolean;
  imageHeight?: string;
  imageClass?: string;
}

const projects: readonly ProjectPanel[] = [
  {
    name: 'OAIZ',
    role: 'Founder',
    descriptor: 'Self-learning AI automation',
    site: 'oaiz.io',
    src: '/presentations/software-factory/oaiz-marketing-logo.svg',
    alt: 'OAIZ marketing logo',
    placement: 'lg:col-start-1 lg:row-start-1',
    imageSurface: 'bg-[#f3f0e6]',
    nameInLogo: true,
  },
  {
    name: 'Debricked',
    role: 'Founder / exit 2022',
    descriptor: 'Security Tool',
    site: 'debricked.com',
    src: '/presentations/deep-research/logos/debricked-logo.png',
    alt: 'Debricked logo',
    placement: 'lg:col-start-1 lg:row-start-2',
    imageSurface: 'bg-[#f3f0e6]',
    nameInLogo: true,
    imageHeight: 'h-[clamp(4.25rem,10vh,6.25rem)]',
    imageClass: 'p-0 scale-[1.35]',
  },
  {
    name: 'Plinty',
    role: 'Founding Chairman',
    descriptor: 'School Platform',
    site: 'plinty.io',
    src: '/presentations/software-factory/plinty-paper-logo.svg',
    alt: 'Plinty logo',
    placement: 'lg:col-start-1 lg:row-start-3',
    imageSurface: 'bg-[#f3f0e6]',
  },
  {
    name: 'Podidex',
    role: 'Founder',
    descriptor: 'Personal AI podcasts',
    site: 'podidex.com',
    src: '/presentations/software-factory/podidex-logo.png',
    alt: 'Podidex logo',
    placement: 'lg:col-start-3 lg:row-start-1',
  },
  {
    name: 'Valkompass.ai',
    role: 'Creator',
    site: 'valkompass.ai',
    src: '/presentations/deep-research/logos/valkompass.avif',
    alt: 'Valkompass.ai logo',
    placement: 'lg:col-start-3 lg:row-start-2',
  },
];

const openSourceProjects = [
  { name: 'gnr8', href: 'https://github.com/oaiz-io/gnr8', descriptor: 'API → SDKs' },
  { name: 'polint', href: 'https://github.com/oaiz-io/polint', descriptor: 'Repo-local lint' },
  {
    name: 'DemoHunter',
    href: 'https://github.com/oaiz-io/demohunter',
    descriptor: 'Demos as code',
  },
] as const;

const panelFrame =
  'flex flex-col items-center justify-center gap-[clamp(0.25rem,0.7vh,0.45rem)] border border-dashed border-[var(--border)] p-[clamp(0.6rem,1.3vh,0.85rem)] text-center';

const siteLink =
  'font-mono text-xs text-primary underline decoration-dashed underline-offset-4 hover:text-foreground';

function Panel({ project }: { project: ProjectPanel }) {
  return (
    <div className={`relative ${panelFrame} ${project.placement}`}>
      <div
        className={`relative z-0 overflow-hidden w-full ${project.imageHeight ?? 'h-[clamp(2.75rem,6vh,3.75rem)]'}`}
      >
        <Image
          src={project.src}
          alt={project.alt}
          fill
          sizes="(min-width: 1024px) 280px, 50vw"
          className={`object-contain p-1.5 ${project.imageSurface ?? ''} ${project.imageClass ?? ''}`}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-[clamp(0.25rem,0.7vh,0.45rem)]">
        {project.nameInLogo ? null : (
          <div className="font-serif text-[clamp(1.05rem,1.5vw,1.4rem)] font-bold uppercase leading-none text-primary">
            {project.name}
          </div>
        )}
        {project.descriptor ? (
          <div className="font-mono text-[clamp(0.8rem,1vw,0.95rem)] leading-tight text-foreground">
            {project.descriptor}
          </div>
        ) : null}
        <Label>{project.role}</Label>
        <a href={`https://${project.site}`} className={siteLink}>
          {project.site}
        </a>
      </div>
    </div>
  );
}

function OpenSourcePanel() {
  return (
    <div className={`${panelFrame} lg:col-start-3 lg:row-start-3`}>
      <Label>Open source</Label>
      <ul className="w-full max-w-[18rem] space-y-[clamp(0.25rem,0.8vh,0.5rem)]">
        {openSourceProjects.map((project) => (
          <li key={project.name} className="flex items-baseline justify-between gap-4">
            <a
              href={project.href}
              className="font-mono text-[clamp(0.95rem,1.3vw,1.2rem)] font-semibold text-primary underline decoration-dashed underline-offset-4"
            >
              {project.name}
            </a>
            <span className="font-mono text-[11px] text-muted-foreground sm:text-xs">
              {project.descriptor}
            </span>
          </li>
        ))}
      </ul>
      <a href="https://github.com/oaiz-io/" className={siteLink}>
        github.com/oaiz-io/
      </a>
    </div>
  );
}

export function WhoIAmSlide() {
  return (
    <SlideFrame>
      <div className="grid gap-x-[clamp(1rem,2.5vw,2rem)] gap-y-[clamp(0.75rem,2vh,1.25rem)] sm:grid-cols-2 lg:grid-cols-[1fr_1.45fr_1fr] lg:grid-rows-3">
        <div className="flex flex-col items-center justify-center px-[clamp(0.5rem,2vw,2rem)] py-[clamp(1rem,3vh,2rem)] text-center sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <h1 className="text-[clamp(2.75rem,6vw,6.25rem)] font-bold leading-[0.92] text-primary">
            Emil
            <br />
            Wåreus
          </h1>
          <p className="mt-[clamp(0.9rem,2.5vh,1.5rem)] max-w-md font-mono text-[clamp(0.9rem,1.25vw,1.15rem)] leading-snug text-foreground">
            Spaghetti coder, ML trainer, agent builder &amp; cat owner
          </p>
          <div className="mt-[clamp(1.25rem,4vh,2.5rem)] border-t border-dashed border-[var(--hair)] px-6 pt-[clamp(0.75rem,2vh,1.25rem)]">
            <a
              href="https://addcommitpush.io"
              className="font-mono text-[clamp(0.95rem,1.3vw,1.2rem)] font-semibold text-primary underline decoration-dashed underline-offset-4 hover:text-foreground"
            >
              addcommitpush.io
            </a>
            <Label className="mt-1">blog &amp; talks</Label>
          </div>
        </div>

        {projects.map((project) => (
          <Panel key={project.name} project={project} />
        ))}
        <OpenSourcePanel />
      </div>
    </SlideFrame>
  );
}

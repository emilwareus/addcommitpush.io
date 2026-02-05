import Link from 'next/link';
import { Presentation, MapPin, Calendar, ArrowRight } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import type { Metadata } from 'next';

export const dynamic = 'error';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Presentations | addcommitpush.io',
  description:
    'Talks and presentations by Emil Wåreus on deep research agents, AI architecture, and software engineering.',
};

interface PresentationEntry {
  title: string;
  description: string;
  href: string;
  venue: string;
  date: string;
}

const presentations: PresentationEntry[] = [
  {
    title: 'Deep Research Agents — Architecture Walkthrough',
    description:
      'An exploration of STORM, ReACT, and diffusion-based architectures for autonomous deep research agents. Includes live demos and benchmark comparisons.',
    href: '/presentations/deep-research',
    venue: 'Foo Cafe, Malmö',
    date: 'February 5, 2026',
  },
];

export default function PresentationsPage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 text-balance">
              <span className="text-primary neon-glow flex items-center gap-4">
                <Presentation className="w-10 h-10 md:w-14 md:h-14" />
                Presentations
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl text-pretty leading-relaxed">
              Talks and walkthroughs on AI, software architecture, and engineering leadership.
            </p>
          </div>

          <div className="space-y-8 md:space-y-10">
            {presentations.map((p) => (
              <Link key={p.href} href={p.href} className="block group">
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl group-hover:text-primary transition-colors">
                      {p.title}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-4 mt-1 text-sm">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {p.venue}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {p.date}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{p.description}</p>
                  </CardContent>
                  <CardFooter>
                    <span className="text-sm text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                      View presentation
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

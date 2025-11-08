import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, BookOpen, Mic, Code2, FlaskConical } from 'lucide-react';
import Image from 'next/image';
import { patents } from '@/lib/patents';

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-16 md:mb-24 text-center">
            <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary via-secondary to-accent p-1">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Image
                  src="/code-icon.svg"
                  alt="Code Icon"
                  width={80}
                  height={80}
                  className="w-14 h-14 sm:w-20 sm:h-20"
                />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-balance">
              <span className="text-primary neon-glow">Hey, I&apos;m</span>{' '}
              <span className="text-secondary neon-glow">Emil</span>
            </h1>
            <div className="prose prose-lg max-w-none text-foreground/90">
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
                I&apos;m a business-savvy data nerd who spends way too much time in front of a
                screen. I run a few different companies, invest, advise, and hack. My most notable
                achievement was founding, scaling, and exiting Debricked, a startup I co-founded in
                2018. Following Debricked&apos;s 2022 acquisition, we joined Micro Focus. I lead
                teams developing application security solutions using machine learning, graph
                algorithms, and static analysis techniques.
              </p>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed mt-4">
                I also enjoy writing spaghetti code while drinking wine. 🍷
              </p>
              <p className="text-base sm:text-lg md:text-xl text-foreground max-w-3xl mx-auto text-balance leading-relaxed mt-6 font-medium">
                Current projects
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 text-left sm:text-center">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2">
                  <Badge asChild variant="outline">
                    <a
                      href="https://oaiz.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      Oaiz
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Badge>
                  <span className="text-sm text-muted-foreground">AI that builds AI agents</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2">
                  <Badge asChild variant="outline">
                    <a
                      href="https://valkompass.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      Valkompass.ai
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Neo4j + Gemini for Swedish political data
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2">
                  <Badge asChild variant="outline">
                    <a
                      href="https://podidex.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      Podidex
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    AI podcast transcript analysis and recommendations
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {/* Podcast Appearances */}
            <Card className="border-secondary/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <Mic className="w-6 h-6 text-secondary" />
                  <h2 className="text-2xl md:text-3xl font-bold text-secondary">
                    Podcast Appearances
                  </h2>
                </div>

                <ul className="space-y-4">
                  <li className="border-l-2 border-secondary/30 pl-4">
                    <a
                      href="https://opensourcesecurity.io/2021/04/11/episode-266-the-future-of-security-scanning-with-debricked/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-secondary transition-colors inline-flex items-center gap-2"
                    >
                      The future of security scanning with Debricked
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground">Open Source Security</p>
                  </li>
                  <li className="border-l-2 border-secondary/30 pl-4">
                    <a
                      href="https://podcast.chaoss.community/33"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-secondary transition-colors inline-flex items-center gap-2"
                    >
                      Managing Portfolios of OSS Projects with Emil Wåreus
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground">CHAOSS</p>
                  </li>
                  <li className="border-l-2 border-secondary/30 pl-4">
                    <a
                      href="https://ittalks.libsyn.com/102-open-source-vulnerability-emil-wreus-from-debricked-swe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-secondary transition-colors inline-flex items-center gap-2"
                    >
                      Open source vulnerability - Emil Wåreus from Debricked
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground">IT Talks (Swedish)</p>
                  </li>
                  <li className="border-l-2 border-secondary/30 pl-4">
                    <a
                      href="https://ittalks.libsyn.com/101-how-to-select-the-best-open-source-project-with-emil-wreus-from-debricked-swe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-secondary transition-colors inline-flex items-center gap-2"
                    >
                      How to select the best open source project
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground">IT Talks (Swedish)</p>
                  </li>
                  <li className="border-l-2 border-secondary/30 pl-4">
                    <a
                      href="https://open.spotify.com/episode/1huwuWIEYpfsW2aUKulZDE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-secondary transition-colors inline-flex items-center gap-2"
                    >
                      Cybersäkerhet och maskininlärning med Emil Wåreus från Debricked
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground">Spotify (Swedish)</p>
                  </li>
                  <li className="border-l-2 border-secondary/30 pl-4">
                    <a
                      href="https://www.linkedin.com/events/7381592382435172352/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-secondary transition-colors inline-flex items-center gap-2"
                    >
                      Neo4j Live: Valkompass.ai - Mapping Political Insight with Graphs & AI
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground">Neo4j</p>
                    <p className="text-foreground/80 mt-2">
                      Exploring how knowledge graphs and AI bring transparency to politics through
                      Valkompass.ai, an open-source project using Neo4j and Gemini to analyze
                      Swedish political data.
                    </p>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Conference Presentations */}
            <Card className="border-primary/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <Mic className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-bold text-primary">
                    Conference Presentations
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="border-l-2 border-primary/30 pl-4">
                    <a
                      href="https://oredev.org/sessions/the-cry-wolf-vulnerability-paradox-the-problem-of-false-alerts-in-vulnerability-scanners"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                      The Cry Wolf Vulnerability Paradox
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      <a
                        href="https://oredev.org/sessions/the-cry-wolf-vulnerability-paradox-the-problem-of-false-alerts-in-vulnerability-scanners"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        ØreDev 2022
                      </a>
                      ,{' '}
                      <a
                        href="https://events.linuxfoundation.org/archive/2022/open-source-summit-north-america/program/schedule/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        Linux Foundation Open Source Summit NA 2022
                      </a>
                    </p>
                    <p className="text-foreground/80 mt-2">
                      Addresses false alert fatigue in security scanning.{' '}
                      <a
                        href="https://www.youtube.com/watch?v=FvOoLU4Oy9I"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Watch video
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  <div className="border-l-2 border-primary/30 pl-4">
                    <a
                      href="https://gotocph.com/2022/sessions/2203/using-graph-database-technology-to-resolve-transitive-vulnerabilities-at-scale"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                      Using Graph Database Technology to Resolve Transitive Vulnerabilities at Scale
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">GOTO Copenhagen 2022</p>
                    <p className="text-foreground/80 mt-2">
                      Neo4j applications for complex dependency resolution.
                    </p>
                  </div>

                  <div className="border-l-2 border-primary/30 pl-4">
                    <a
                      href="https://foocafe.org/event/predicting-rise-and-fall-open-source-project"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                      Predicting the rise and fall of Open Source
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">Foo Café Malmö 2022</p>
                    <p className="text-foreground/80 mt-2">
                      Community health metrics and project success prediction.{' '}
                      <a
                        href="https://www.youtube.com/watch?v=u9jU4xJ03ek"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Watch video
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  <div className="border-l-2 border-primary/30 pl-4">
                    <a
                      href="https://www.foocafe.org/event/state-ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                      Semantic Code Discovery - AI-powered code recommendations
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      Foo Café Malmö 2022, State of AI series
                    </p>
                    <p className="text-foreground/80 mt-2">
                      Introduction to semantic code search capabilities.{' '}
                      <a
                        href="https://youtu.be/swZAIirxdik?t=1881"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Watch video
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  <div className="border-l-2 border-primary/30 pl-4">
                    <div className="text-lg font-medium text-foreground">
                      Additional Presentations
                    </div>
                    <p className="text-foreground/80 mt-2">
                      Zero to One AI education for managers, company tech-talks, hackathons, and
                      machine learning events.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Blog Posts */}
            <Card className="border-accent/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <ExternalLink className="w-6 h-6 text-accent" />
                  <h2 className="text-2xl md:text-3xl font-bold text-accent">
                    External Blog Posts
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://www.linkedin.com/pulse/predicting-rise-fall-open-source-project-debricked/?trackingId=f7Gpg43aQbi33TYhprtNqg%3D%3D"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      Predicting the rise and fall of an open source project
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">LinkedIn</p>
                    <p className="text-foreground/80 mt-2">
                      Research on why projects become unmaintained.{' '}
                      <a
                        href="https://www.youtube.com/watch?v=u9jU4xJ03ek"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline inline-flex items-center gap-1"
                      >
                        Watch the talk
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://www.linkedin.com/pulse/how-neo4js-graph-database-can-remediate-vulnerabilities-debricked/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      How Neo4j&apos;s Graph database can remediate vulnerabilities
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">LinkedIn</p>
                    <p className="text-foreground/80 mt-2">
                      Demonstrates graph database approaches for dependency vulnerability analysis.
                    </p>
                  </div>

                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://thehackernews.com/2022/11/last-years-open-source-tomorrows.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      Last Years Open Source - Tomorrow&apos;s Vulnerabilities
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">The Hacker News</p>
                    <p className="text-foreground/80 mt-2">
                      Data-driven insights on vulnerability discovery timelines.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Papers */}
            <Card className="border-secondary/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <BookOpen className="w-6 h-6 text-secondary" />
                  <h2 className="text-2xl md:text-3xl font-bold text-secondary">Papers</h2>
                </div>

                <div className="space-y-8">
                  {/* Primary Publications */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">
                      Primary Publications
                    </h3>
                    <div className="space-y-6">
                      <div className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://link.springer.com/chapter/10.1007/978-3-030-52683-2_1"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Automated CPE Labeling of CVE Summaries with Machine Learning
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">Springer</p>
                        <p className="text-foreground/80 mt-2">
                          Addresses vulnerability database labeling using Named Entity Recognition.
                          Achieved F-measure of 0.86 with precision 0.857 and recall 0.865.
                        </p>
                      </div>

                      <div className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.scitepress.org/Link.aspx?doi=10.5220/0010813000003120"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Security Issue Classification for Vulnerability Management with
                          Semi-supervised Learning
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">SCITEPRESS</p>
                        <p className="text-foreground/80 mt-2">
                          Uses Hierarchical Attention Networks for automated classification.
                          Achieved F1 score of 71% and identified approximately 191,036 potentially
                          vulnerable issues. Nominated for best paper at conference.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Supervised Publications */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">
                      Supervised Publications
                    </h3>
                    <ul className="space-y-3">
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://re.public.polimi.it/handle/11311/1223328"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Detecting Security Patches in Java Projects Using NLP Technology
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Politecnico di Milano</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/9067251"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Automating vulnerability remediation in Maven
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/9075536"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Exploring Subjectivity in ad hoc Assessment of Open Source Software
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/93a45265-e5cb-4d38-a440-dcd41a07552a"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Vulnerability detection using ensemble learning
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/9043573"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Exploring the Business Value and User Experience of Open Source Health
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/9105730"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Supply chain attacks in open source projects
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/9128130"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Recommending Relevant Open Source Software using Semantic Functionality
                          Search
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.lunduniversity.lu.se/lup/publication/9128152"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Machine Learning Based Code Generation of Security Patches
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">Lund University</p>
                      </li>
                      <li className="border-l-2 border-secondary/30 pl-4">
                        <a
                          href="https://www.imis.uni-luebeck.de/de/lehre/abschlussarbeit/10339"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-secondary transition-colors inline-flex items-center gap-2"
                        >
                          Reducing time of vulnerability exposure in open source software usage for
                          public sector software development
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-sm text-muted-foreground">University of Lübeck</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patents */}
            <Card className="border-primary/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <FileText className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-bold text-primary">Patents</h2>
                </div>

                <div className="space-y-6">
                  {patents.map((patent, index) => (
                    <div key={index} className="border-l-2 border-primary/30 pl-4">
                      <div className="text-lg font-medium text-foreground mb-1">{patent.title}</div>
                      <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground mt-1">
                        {patent.filings.map((filing, filingIndex) => (
                          <span key={filing.id}>
                            <a
                              href={filing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {filing.id}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {filingIndex < patent.filings.length - 1 && (
                              <span className="mx-1">•</span>
                            )}
                          </span>
                        ))}
                        <span>• {patent.assignee}</span>
                      </div>
                      <p className="text-foreground/80 mt-2">{patent.summary}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Open Source Projects */}
            <Card className="border-accent/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <Code2 className="w-6 h-6 text-accent" />
                  <h2 className="text-2xl md:text-3xl font-bold text-accent">
                    Open Source Projects
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://github.com/emilwareus/addcommitpush.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      addcommitpush.io
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">Next.js • TypeScript</p>
                    <p className="text-foreground/80 mt-2">
                      This blog platform itself, built with Next.js 16. Features SSG, and audio
                      narration for posts. Open-sourced so you can see how it&apos;s built - warts
                      and all.
                    </p>
                  </div>

                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://github.com/debricked/cli"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      Debricked CLI
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">Go • Docker</p>
                    <p className="text-foreground/80 mt-2">
                      Command-line interface for open source security scanning and software
                      composition analysis. Delivers vulnerability detection, compliance checking,
                      and health metrics directly to the command prompt. Integrates seamlessly into
                      CI/CD pipelines with multi-platform support.
                    </p>
                  </div>

                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://github.com/valkompass-ai/valkompass-ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      Valkompass.ai
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">Next.js • Neo4j • Gemini</p>
                    <p className="text-foreground/80 mt-2">
                      Open source platform for exploring Swedish political party positions using
                      AI-powered analysis. Combines knowledge graphs (Neo4j) with Google Gemini to
                      analyze party programs, manifestos, and voting records. Provides transparent,
                      data-driven insights for voters, journalists, and citizens.
                    </p>
                  </div>

                  <div className="border-l-2 border-accent/30 pl-4">
                    <a
                      href="https://github.com/emilwareus/i-hate-group-chats"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      I Hate Group Chats
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">NLP</p>
                    <p className="text-foreground/80 mt-2">
                      Early-stage project automating group chat management using NLP. Self-described
                      as &quot;very very early stage&quot;.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Research Projects */}
            <Card className="border-primary/30">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <FlaskConical className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-bold text-primary">Research Projects</h2>
                </div>

                <div className="space-y-6">
                  <div className="border-l-2 border-primary/30 pl-4">
                    <a
                      href="https://github.com/arvos-dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                      ARVOS
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI and Risk-based Vulnerability Management for Trustworthy Open Source
                      Adoption
                    </p>
                    <p className="text-foreground/80 mt-2">
                      Runtime vulnerability detection using eBPF.{' '}
                      <a
                        href="https://www.vinnova.se/en/p/ai--and-risk-based-vulnerability-management-for-trustworthy-open-source-adoption-arvos/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Funded by Vinnova
                      </a>
                      . Collaboration:{' '}
                      <a
                        href="https://www.debricked.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Debricked
                      </a>
                      ,{' '}
                      <a
                        href="https://elastisys.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Elastisys
                      </a>
                      .
                    </p>
                  </div>

                  <div className="border-l-2 border-primary/30 pl-4">
                    <div className="text-lg font-medium text-foreground">HASMOSS</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Health and Security Management in Open Source Software
                    </p>
                    <p className="text-foreground/80 mt-2">
                      Swedish industry OSS risk management initiative. Partners: RISE,{' '}
                      <a
                        href="https://www.debricked.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Debricked
                      </a>
                      ,{' '}
                      <a
                        href="https://www.scania.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Scania
                      </a>
                      ,{' '}
                      <a
                        href="https://addalot.se/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Addalot
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

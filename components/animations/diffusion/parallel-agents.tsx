"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Users, Search, ArrowDown, FilePenLine, CheckCircle2, Repeat2 } from "lucide-react";

interface ParallelAgentsProps {
  className?: string;
}

const agents = [
  {
    name: "Sub-Agent 1",
    focus: "Global or section-level query",
    topic: "Topic A",
  },
  {
    name: "Sub-Agent 2",
    focus: "Section-specific deep dive",
    topic: "Topic B",
  },
  {
    name: "Sub-Agent 3",
    focus: "Comparative or incident-focused",
    topic: "Topic C",
  },
];

export function ParallelAgents({ className }: ParallelAgentsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-10% 0px -10% 0px', amount: 0.2 });
  const [stage, setStage] = useState<'assign' | 'research' | 'collect' | 'refine' | 'decide'>('assign');
  const lastStageRef = useRef<typeof stage>('assign');
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Fixed-duration animation timeline using requestAnimationFrame to avoid drift/jitter.
  useEffect(() => {
    const timeline: Array<{ stage: typeof stage; duration: number }> = [
      { stage: 'assign', duration: 2000 },
      { stage: 'research', duration: 2800 },
      { stage: 'collect', duration: 1800 },
      { stage: 'refine', duration: 2200 },
      { stage: 'decide', duration: 1800 },
    ];
    const totalDuration = timeline.reduce((acc, item) => acc + item.duration, 0);

    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (!isInView) {
      startRef.current = null;
      stop();
      return;
    }

    startRef.current = performance.now();

    const tick = () => {
      if (startRef.current === null) return;
      const now = performance.now();
      const elapsed = (now - startRef.current) % totalDuration;

      let accumulated = 0;
      let nextStage: typeof stage = timeline[timeline.length - 1].stage;
      for (const item of timeline) {
        accumulated += item.duration;
        if (elapsed < accumulated) {
          nextStage = item.stage;
          break;
        }
      }

      if (nextStage !== lastStageRef.current) {
        lastStageRef.current = nextStage;
        setStage(nextStage);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      stop();
    };
  }, [isInView]);

  // Helper functions for opacity/visibility states
  const getSupervisorOpacity = () => {
    if (stage === 'assign') return 1;
    if (stage === 'research') return 0.8;
    return 0.7;
  };

  const getSupervisorScale = () => {
    if (stage === 'assign') return 1;
    return 0.98;
  };

  const getSubAgentOpacity = () => {
    if (stage === 'assign') return 0.4;
    if (stage === 'research') return 1;
    if (stage === 'collect' || stage === 'refine' || stage === 'decide') return 0.8;
    return 0.4;
  };

  const getSubAgentScale = () => {
    if (stage === 'research') return 1.02;
    return 1;
  };

  const getSubAgentBorder = () => {
    if (stage === 'research') return "border-primary/80 bg-primary/5 shadow-lg shadow-primary/20";
    if (stage === 'collect' || stage === 'refine' || stage === 'decide') return "border-green-500/40 bg-green-500/5";
    return "border-border/70 bg-background/70";
  };

  const getSubAgentIconColor = () => {
    if (stage === 'research') return "text-primary";
    if (stage === 'collect' || stage === 'refine' || stage === 'decide') return "text-green-500";
    return "text-muted-foreground";
  };

  const getResearchingOpacity = () => {
    return stage === 'research' ? 1 : 0;
  };

  const getFindingsReturnedOpacity = () => {
    return (stage === 'collect' || stage === 'refine' || stage === 'decide') ? 1 : 0;
  };

  const getConvergingArrowsOpacity = () => {
    if (stage === 'assign' || stage === 'research') return 0.3;
    if (stage === 'collect' || stage === 'refine' || stage === 'decide') return 1;
    return 0.3;
  };

  const getRefineBoxOpacity = () => {
    if (stage === 'assign' || stage === 'research' || stage === 'collect') return 0.3;
    if (stage === 'refine' || stage === 'decide') return 1;
    return 0.3;
  };

  const getRefineBoxScale = () => {
    if (stage === 'refine') return 1.02;
    return 1;
  };

  const getRefineBoxBorder = () => {
    if (stage === 'refine') return "border-primary/60 bg-primary/5 shadow-lg shadow-primary/20";
    return "border-border/70 bg-background/70";
  };

  const getDecisionOpacity = () => {
    if (stage === 'decide') return 1;
    return 0.3;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 shadow-lg space-y-6",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary">Parallel Sub-Agents</p>
          <h3 className="text-lg font-semibold">Supervisor coordinates up to 3 research threads</h3>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="relative space-y-6">
        {/* Supervisor */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{
              opacity: getSupervisorOpacity(),
              scale: getSupervisorScale(),
            }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-primary/60 bg-primary/5 p-4 text-sm font-semibold text-center min-w-[200px]"
          >
            <Users className="h-5 w-5 text-primary mb-2 mx-auto" />
            <div className="mb-1">Supervisor</div>
            <p className="text-xs text-muted-foreground font-normal">
              {stage === 'assign' && 'Assigning distinct questions...'}
              {stage === 'research' && 'Monitoring parallel research...'}
              {stage === 'collect' && 'Collecting findings...'}
              {stage === 'refine' && 'Refining draft...'}
              {stage === 'decide' && 'Assessing completeness...'}
            </p>
          </motion.div>
        </div>

        {/* Parallel Sub-Agents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {agents.map((agent, idx) => {
            return (
              <div key={agent.name} className="relative flex flex-col items-center">
                {/* Sub-agent box */}
                <motion.div
                  initial={{ opacity: 0.4, scale: 0.98 }}
                  animate={{
                    opacity: getSubAgentOpacity(),
                    scale: getSubAgentScale(),
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "rounded-xl border p-4 text-sm text-left min-h-[160px] w-full flex flex-col gap-2 relative transition-colors",
                    getSubAgentBorder()
                  )}
                >
                  <p className="font-semibold flex items-center gap-2">
                    <Search className={cn(
                      "h-4 w-4 transition-colors",
                      getSubAgentIconColor()
                    )} />
                    {agent.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Topic:</span> {agent.topic}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Focus:</span> {agent.focus}
                  </p>
                  
                  {/* Status messages container - always render, control opacity */}
                  <div className="mt-auto pt-2 border-t border-border/50 relative min-h-[24px]">
                    {/* Researching status */}
                    <motion.div
                      animate={{ opacity: getResearchingOpacity() }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex items-center"
                      style={{ pointerEvents: getResearchingOpacity() > 0 ? 'auto' : 'none' }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <motion.div
                          animate={{ rotate: stage === 'research' ? 360 : 0 }}
                          transition={{ duration: 2, repeat: stage === 'research' ? Infinity : 0, ease: "linear" }}
                        >
                          <Repeat2 className="h-3 w-3 text-primary" />
                        </motion.div>
                        <span>Researching...</span>
                      </div>
                    </motion.div>

                    {/* Findings returned status */}
                    <motion.div
                      animate={{ opacity: getFindingsReturnedOpacity() }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex items-center"
                      style={{ pointerEvents: getFindingsReturnedOpacity() > 0 ? 'auto' : 'none' }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Findings returned</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Arrow below center sub-agent only - always render */}
                {idx === 1 && (
                  <motion.div
                    animate={{ opacity: getConvergingArrowsOpacity() }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 hidden md:block"
                  >
                    <ArrowDown className="h-6 w-6 text-muted-foreground" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Refine Draft Report - always render */}
        <motion.div
          animate={{ 
            opacity: getRefineBoxOpacity(),
            y: getRefineBoxOpacity() > 0.5 ? 0 : 10
          }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <motion.div
            animate={{
              scale: getRefineBoxScale(),
            }}
            transition={{ duration: 0.3 }}
            className={cn(
              "rounded-xl border p-4 text-sm text-center min-w-[200px] transition-colors",
              getRefineBoxBorder()
            )}
          >
            <FilePenLine className={cn(
              "h-5 w-5 mb-2 mx-auto transition-colors",
              stage === 'refine' ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="font-semibold mb-1">refine_draft_report</div>
            <p className="text-xs text-muted-foreground font-normal">
              {stage === 'refine' ? 'Incorporating findings with citations...' : 'Draft updated with citations'}
            </p>
          </motion.div>
        </motion.div>

        {/* Decision point - always render */}
        <motion.div
          animate={{ 
            opacity: getDecisionOpacity(),
            y: getDecisionOpacity() > 0.5 ? 0 : 10
          }}
          transition={{ duration: 0.4 }}
          className="flex justify-center items-center"
        >
          <div className="rounded-xl border border-border/70 bg-background/70 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Continue loop or</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">ResearchComplete?</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">How it works:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <div>
              <span className="font-medium">1. Assign:</span> Supervisor generates research questions and delegates to sub-agents (max 3 parallel)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <div>
              <span className="font-medium">2. Research:</span> Sub-agents work independently with isolated contexts, return compressed findings
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <div>
              <span className="font-medium">3. Refine:</span> Findings converge, draft updated with citations, completeness assessed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type TerminalCommandProps = {
  children: ReactNode
  className?: string
}

export function TerminalCommand({ children, className }: TerminalCommandProps) {
  return (
    <span
      className={cn(
        "inline-block align-baseline rounded border border-border bg-muted/70 px-2 py-0.5",
        "font-mono text-sm text-red-400 whitespace-nowrap",
        className
      )}
      style={{
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace',
      }}
    >
      {children}
    </span>
  )
}


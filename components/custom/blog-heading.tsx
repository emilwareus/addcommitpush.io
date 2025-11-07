import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const headingVariants = cva(
  "font-bold text-balance scroll-mt-20",
  {
      variants: {
        level: {
          1: "text-3xl sm:text-4xl md:text-5xl text-primary neon-glow mt-12 mb-8",
          2: "text-2xl sm:text-3xl md:text-4xl text-primary neon-glow mt-16 mb-6 pb-3 border-b border-primary/30",
          3: "text-xl sm:text-2xl md:text-3xl text-primary mt-14 mb-5",
          4: "text-lg sm:text-xl md:text-2xl text-foreground mt-12 mb-4",
          5: "text-base sm:text-lg md:text-xl text-foreground mt-10 mb-3",
          6: "text-sm sm:text-base md:text-lg text-muted-foreground mt-8 mb-2",
        },
      },
    defaultVariants: {
      level: 1,
    },
  }
)

export interface BlogHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  level: 1 | 2 | 3 | 4 | 5 | 6
}

export function BlogHeading({
  level,
  className,
  children,
  id,
  ...props
}: BlogHeadingProps) {
  const Comp = `h${level}` as const

  return React.createElement(
    Comp,
    {
      id,
      className: cn(headingVariants({ level }), className),
      ...props,
    },
    children
  )
}

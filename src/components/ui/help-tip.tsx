"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTipProps {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * A small circular ? icon that shows a tooltip with a help message on hover.
 * Usage: <HelpTip text="Explicación del campo..." />
 */
export function HelpTip({ text, side = "top", className }: HelpTipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center cursor-help text-muted-foreground hover:text-primary transition-colors",
              className
            )}
            tabIndex={0}
            aria-label="Ayuda"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed whitespace-pre-line">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

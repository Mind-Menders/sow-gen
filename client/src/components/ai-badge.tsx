import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AIBadgeProps {
  children: React.ReactNode;
  tooltip?: string;
  position?: "top-right" | "bottom-right" | "inline";
  size?: "sm" | "md" | "lg";
}

export function AIBadge({ 
  children, 
  tooltip = "AI-Powered Feature",
  position = "inline",
  size = "sm"
}: AIBadgeProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const badge = (
    <div className="inline-flex items-center gap-1.5">
      {children}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative inline-flex">
              <Sparkles 
                className={`${sizeClasses[size]} text-purple-600 animate-pulse`}
                style={{
                  filter: "drop-shadow(0 0 4px rgba(147, 51, 234, 0.4))"
                }}
              />
              <span className="absolute inset-0 animate-ping">
                <Sparkles className={`${sizeClasses[size]} text-purple-400 opacity-30`} />
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-purple-600 text-white border-purple-700">
            <p className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              {tooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  if (position === "inline") {
    return badge;
  }

  return (
    <div className="relative inline-block">
      {children}
      <div className={`absolute ${position === "top-right" ? "-top-1 -right-1" : "-bottom-1 -right-1"} z-10`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <div className="bg-purple-600 rounded-full p-0.5 shadow-lg ring-2 ring-white">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="absolute inset-0 animate-ping bg-purple-400 rounded-full opacity-30" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-purple-600 text-white border-purple-700">
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {tooltip}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface AIContainerProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function AIContainer({ children, enabled = true }: AIContainerProps) {
  if (!enabled) return <>{children}</>;
  
  return (
    <div className="relative group">
      {children}
      <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 animate-pulse" />
        <div className="absolute inset-0 rounded-lg ring-1 ring-purple-500/20" />
      </div>
    </div>
  );
}

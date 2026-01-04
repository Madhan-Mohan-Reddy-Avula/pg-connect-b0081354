import { HelpCircle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  variant?: 'help' | 'info';
  className?: string;
}

export function InfoTooltip({ 
  content, 
  side = 'top', 
  variant = 'help',
  className 
}: InfoTooltipProps) {
  const Icon = variant === 'help' ? HelpCircle : Info;
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button" 
            className={cn(
              "inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors",
              className
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className="max-w-[280px] text-sm leading-relaxed bg-popover border-border"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export function LabelWithTooltip({ 
  label, 
  tooltip, 
  required, 
  htmlFor,
  className 
}: LabelWithTooltipProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <InfoTooltip content={tooltip} />
    </div>
  );
}

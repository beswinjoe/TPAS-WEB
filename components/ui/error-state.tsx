import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="p-3 rounded-xl bg-muted mb-4">
        <AlertCircle className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="mt-4 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition-colors bg-muted hover:bg-muted/80"
        >
          Retry
        </button>
      )}
    </div>
  );
}

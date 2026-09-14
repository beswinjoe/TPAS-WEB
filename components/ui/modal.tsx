'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-2xl' or 'max-w-4xl'
  className?: string; // For additional body styling if needed
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  maxWidth = 'max-w-[640px]',
  className
}: ModalProps) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* OVERLAY: fixed, scrollable. If modal ever exceeds viewport, the overlay scrolls. */
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* CENTERING WRAPPER: min-h-full so flex centering works for short modals.
          When content is taller than viewport, min-h-full grows and the outer div scrolls. */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        {/* MODAL PANEL: sizes to content, clamped by max-h. 
            flex-col so header/footer pin and body scrolls. */}
        <div 
          className={cn(
            "bg-card w-full rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-slide-up",
            "max-h-[calc(100vh-2rem)]",
            maxWidth
          )} 
          onClick={e => e.stopPropagation()}
        >
          {/* HEADER: flex-none, never scrolls, never grows */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-border/50 flex-none bg-card">
            {typeof title === 'string' ? (
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            ) : (
              title
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors flex-none"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* BODY: flex-1 fills remaining space after header+footer within max-h.
              - min-h-0: allows shrinking below content size
              - overflow-y-auto: scrollbar when content exceeds allocated space
              - flex-1: in max-h-constrained container, body = max-h - header - footer.
                In auto-height container (short forms), no extra space = no blank gap. */}
          <div className={cn("px-7 py-6 overflow-y-auto flex-1 min-h-0", className)}>
            {children}
          </div>

          {/* FOOTER: flex-none, never scrolls, never creates blank space */}
          {footer && (
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-7 py-5 border-t border-border/50 bg-muted/20 flex-none">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

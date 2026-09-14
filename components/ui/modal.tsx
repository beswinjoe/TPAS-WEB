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
  maxWidth?: string;
  className?: string;
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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex justify-center items-start p-4 sm:p-6">
        <div
          className={cn(
            "bg-card w-full rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-slide-up",
            "max-h-[calc(100vh-2rem)]",
            maxWidth
          )}
          onClick={e => e.stopPropagation()}
        >
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

          <div className={cn("px-7 py-6 overflow-y-auto min-h-0", className)}>
            {children}
          </div>

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

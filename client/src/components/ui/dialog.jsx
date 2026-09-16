import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Modal simples com portal, backdrop e fechamento por ESC.
export function Dialog({ open, onClose, children, className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 my-8 w-full max-w-lg animate-fade-in rounded-2xl border border-border bg-card shadow-2xl',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ title, description }) {
  return (
    <div className="border-b border-border px-6 py-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function DialogBody({ className, children }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}

export function DialogFooter({ children }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">{children}</div>
  );
}

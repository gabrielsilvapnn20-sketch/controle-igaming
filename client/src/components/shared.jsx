import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Inbox, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="mb-4 rounded-2xl bg-secondary p-4 text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Excluir' }) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogBody className="pt-8">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger/15">
          <AlertTriangle className="h-5 w-5 text-danger" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Exibe variação percentual com cor/seta.
export function TrendPill({ variacao, invertido = false }) {
  if (variacao == null) {
    return <span className="text-xs text-muted-foreground">— sem base</span>;
  }
  const positivo = invertido ? variacao < 0 : variacao > 0;
  const neutro = variacao === 0;
  const cor = neutro ? 'text-muted-foreground' : positivo ? 'text-success' : 'text-danger';
  const seta = neutro ? '' : variacao > 0 ? '▲' : '▼';
  return (
    <span className={cn('text-xs font-medium tabular-nums', cor)}>
      {seta} {Math.abs(variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
    </span>
  );
}

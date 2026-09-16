import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  fechado: 'bg-success/15 text-success border-success/30',
  negociando: 'bg-warning/15 text-warning border-warning/30',
  pausado: 'bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30',
};

const MODELO_STYLES = {
  stories: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  fixo: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  percentual: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const STATUS_LABEL = { fechado: 'Fechado', negociando: 'Negociando', pausado: 'Pausado' };
const MODELO_LABEL = { stories: 'Stories', fixo: 'Fixo', percentual: 'Percentual' };

export function Badge({ className, variant = 'default', children, ...props }) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors';
  const variants = {
    default: 'border-transparent bg-primary/15 text-primary',
    outline: 'border-border text-foreground',
    success: 'border-success/30 bg-success/15 text-success',
    danger: 'border-danger/30 bg-danger/15 text-danger',
    warning: 'border-warning/30 bg-warning/15 text-warning',
  };
  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] || STATUS_STYLES.pausado,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function ModeloBadge({ modelo }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        MODELO_STYLES[modelo] || 'border-border',
      )}
    >
      {MODELO_LABEL[modelo] || modelo}
    </span>
  );
}

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendPill } from '@/components/shared';
import { cn } from '@/lib/utils';

export function KpiCard({ label, value, icon: Icon, variacao, invertido, accent = 'primary', loading }) {
  const accentMap = {
    primary: 'from-primary/20 to-primary/5 text-primary',
    success: 'from-success/20 to-success/5 text-success',
    danger: 'from-danger/20 to-danger/5 text-danger',
    warning: 'from-warning/20 to-warning/5 text-warning',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400',
  };

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden p-5 hover:shadow-2xl hover:shadow-black/30">
      <div
        className={cn(
          'absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition-opacity group-hover:opacity-70',
          accentMap[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn('rounded-lg bg-gradient-to-br p-2', accentMap[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="relative mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[1.7rem]">
        {value}
      </p>
      {variacao !== undefined && (
        <div className="relative mt-2 flex items-center gap-1.5">
          <TrendPill variacao={variacao} invertido={invertido} />
          <span className="text-xs text-muted-foreground">vs período anterior</span>
        </div>
      )}
    </Card>
  );
}

import { formatBRL, formatData, formatPercent } from '@/lib/format';

// Tooltip customizado para os gráficos (não o padrão cru do Recharts).
export function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
      {label != null && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </span>
            <span className="font-semibold tabular-nums">
              {item.unit === '%' ? formatPercent(item.value) : formatBRL(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTooltip(props) {
  return <ChartTooltip {...props} labelFormatter={(l) => formatData(l)} />;
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  Users,
  Receipt,
  DollarSign,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared';
import { DataTooltip, ChartTooltip } from '@/components/ChartTooltip';
import { api } from '@/lib/api';
import { formatBRL, formatBRLCompact, formatDataCurta, formatPercent, hojeISO, addDiasISO, inicioDoMesISO } from '@/lib/format';

const PRESETS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Mês atual' },
  { id: 'custom', label: 'Personalizado' },
];

function rangeFromPreset(preset, custom) {
  const hoje = hojeISO();
  switch (preset) {
    case 'hoje':
      return { inicio: hoje, fim: hoje };
    case '7d':
      return { inicio: addDiasISO(hoje, -6), fim: hoje };
    case '30d':
      return { inicio: addDiasISO(hoje, -29), fim: hoje };
    case 'mes':
      return { inicio: inicioDoMesISO(), fim: hoje };
    case 'custom':
      return { inicio: custom.inicio, fim: custom.fim };
    default:
      return { inicio: addDiasISO(hoje, -29), fim: hoje };
  }
}

export default function Dashboard() {
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState({ inicio: addDiasISO(hojeISO(), -29), fim: hojeISO() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => rangeFromPreset(preset, custom), [preset, custom]);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    api
      .getDashboard(range.inicio, range.fim)
      .then((d) => ativo && setData(d))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [range.inicio, range.fim]);

  const cards = data?.cards;
  const temDados = data && data.metricas.qtdLancamentos > 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da performance financeira da agência">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ' +
                (preset === p.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {preset === 'custom' && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/60 p-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Início</label>
            <input
              type="date"
              value={custom.inicio}
              max={custom.fim}
              onChange={(e) => setCustom((c) => ({ ...c, inicio: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background/60 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fim</label>
            <input
              type="date"
              value={custom.fim}
              min={custom.inicio}
              max={hojeISO()}
              onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background/60 px-3 text-sm"
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          loading={loading}
          label="Receita bruta"
          value={formatBRL(cards?.receitaBruta.valor)}
          variacao={cards?.receitaBruta.variacao}
          icon={DollarSign}
          accent="sky"
        />
        <KpiCard
          loading={loading}
          label="Sua receita líquida"
          value={formatBRL(cards?.receitaLiquida.valor)}
          variacao={cards?.receitaLiquida.variacao}
          icon={Wallet}
          accent="primary"
        />
        <KpiCard
          loading={loading}
          label="Pago a influenciadores"
          value={formatBRL(cards?.totalPago.valor)}
          variacao={cards?.totalPago.variacao}
          invertido
          icon={Users}
          accent="warning"
        />
        <KpiCard
          loading={loading}
          label="Gastos extras"
          value={formatBRL(cards?.gastosExtras.valor)}
          variacao={cards?.gastosExtras.variacao}
          invertido
          icon={Receipt}
          accent="warning"
        />
        <KpiCard
          loading={loading}
          label={cards && cards.lucro.valor < 0 ? 'Prejuízo do período' : 'Lucro do período'}
          value={formatBRL(cards?.lucro.valor)}
          variacao={cards?.lucro.variacao}
          icon={TrendingUp}
          accent={cards && cards.lucro.valor < 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do lucro diário</CardTitle>
            <CardDescription>Lucro líquido por dia no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : temDados ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.serieDiaria} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(262 83% 62%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(262 83% 62%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" vertical={false} />
                  <XAxis
                    dataKey="data"
                    tickFormatter={formatDataCurta}
                    tick={{ fill: 'hsl(217 15% 62%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(v) => formatBRLCompact(v)}
                    tick={{ fill: 'hsl(217 15% 62%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip content={<DataTooltip />} cursor={{ stroke: 'hsl(262 83% 62%)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    name="Lucro"
                    stroke="hsl(262 83% 62%)"
                    strokeWidth={2.5}
                    fill="url(#gLucro)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem dados no período" description="Registre lançamentos para ver a evolução." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lucro por influenciador</CardTitle>
            <CardDescription>Top desempenhos no período</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : data?.lucroPorInfluenciador.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.lucroPorInfluenciador.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatBRLCompact(v)}
                    tick={{ fill: 'hsl(217 15% 62%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    tick={{ fill: 'hsl(210 40% 96%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={92}
                    tickFormatter={(v) => (v.length > 12 ? v.slice(0, 12) + '…' : v)}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(222 30% 18% / 0.5)' }} />
                  <Bar dataKey="lucro" name="Lucro" radius={[0, 6, 6, 0]} barSize={18}>
                    {data.lucroPorInfluenciador.slice(0, 8).map((e, i) => (
                      <Cell key={i} fill={e.lucro < 0 ? 'hsl(0 72% 60%)' : 'hsl(262 83% 62%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem dados" description="Nenhum lançamento no período." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parcerias no prejuízo */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Parcerias no prejuízo
            </CardTitle>
            <CardDescription>Precisam de atenção no período selecionado</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : data?.prejuizos.length ? (
            <div className="space-y-2">
              {data.prejuizos.map((p) => (
                <Link
                  key={p.id}
                  to={`/influenciadores/${p.id}`}
                  className="group flex items-center justify-between rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 transition-colors hover:bg-danger/10"
                >
                  <div>
                    <p className="text-sm font-medium">{p.nome}</p>
                    {p.instagram && <p className="text-xs text-muted-foreground">{p.instagram}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-danger tabular-nums">{formatBRL(p.lucro)}</p>
                      <p className="text-xs text-muted-foreground">ROI {formatPercent(p.roi)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma parceria no prejuízo 🎉"
              description="Todas as parcerias estão positivas no período."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

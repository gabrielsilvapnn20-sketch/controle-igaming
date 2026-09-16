import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  Users,
  Coins,
  Target,
  CalendarDays,
  Film,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, ModeloBadge } from '@/components/ui/badge';
import { EmptyState, ConfirmDialog } from '@/components/shared';
import { DataTooltip } from '@/components/ChartTooltip';
import { InfluenciadorForm } from '@/components/InfluenciadorForm';
import { LancamentoForm } from '@/components/LancamentoForm';
import { api } from '@/lib/api';
import { formatBRL, formatData, formatNumero, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const DICA_ICONS = {
  sucesso: { icon: CheckCircle2, cls: 'text-success bg-success/10 border-success/20' },
  perigo: { icon: XCircle, cls: 'text-danger bg-danger/10 border-danger/20' },
  alerta: { icon: AlertTriangle, cls: 'text-warning bg-warning/10 border-warning/20' },
  info: { icon: Info, cls: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
};

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn('mt-1.5 text-lg font-bold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

export default function InfluenciadorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [config, setConfig] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [lancOpen, setLancOpen] = useState(false);
  const [lancEdit, setLancEdit] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // lançamento a excluir
  const [confirmDelInflu, setConfirmDelInflu] = useState(false);

  const carregar = useCallback(() => {
    api.getInfluenciador(id).then(setInfo);
  }, [id]);

  useEffect(() => {
    carregar();
    api.getConfig().then(setConfig);
  }, [carregar]);

  if (!info) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const m = info.metricas;
  const serie = info.lancamentos
    .map((l) => ({ data: l.data, lucro: l.lucro }))
    .sort((a, b) => a.data.localeCompare(b.data));

  async function excluirLancamento() {
    await api.deleteLancamento(confirmDel.id);
    setConfirmDel(null);
    carregar();
  }
  async function excluirInfluenciador() {
    await api.deleteInfluenciador(id);
    navigate('/influenciadores');
  }

  return (
    <div>
      <button
        onClick={() => navigate('/influenciadores')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para influenciadores
      </button>

      {/* Cabeçalho */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-600 text-xl font-bold text-white shadow-lg shadow-primary/30">
              {info.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{info.nome}</h1>
                <StatusBadge status={info.status} />
                <ModeloBadge modelo={info.modeloPagamento} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{info.instagram || 'sem @'}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {info.dataInicio && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Início {formatData(info.dataInicio)}
                    {info.diasParceria != null && ` · ${info.diasParceria} dias de parceria`}
                  </span>
                )}
                {info.modeloPagamento === 'percentual' && info.percentualComissao != null && (
                  <span>Comissão: {formatPercent(info.percentualComissao)}</span>
                )}
                {info.modeloPagamento === 'fixo' && info.valorFixo != null && (
                  <span>
                    Fixo: {formatBRL(info.valorFixo)} / {info.recorrencia}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelInflu(true)} aria-label="Excluir">
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
            <Button onClick={() => { setLancEdit(null); setLancOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Button>
          </div>
        </div>
        {info.observacoes && (
          <p className="mt-4 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
            {info.observacoes}
          </p>
        )}
      </Card>

      {/* Métricas */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Receita líquida" value={formatBRL(m.receitaLiquidaTotal)} icon={Wallet} tone="text-primary" />
        <Metric label="Total pago" value={formatBRL(m.totalPago)} icon={Users} tone="text-warning" />
        <Metric
          label={m.lucro < 0 ? 'Prejuízo' : 'Lucro'}
          value={formatBRL(m.lucro)}
          icon={TrendingUp}
          tone={m.lucro < 0 ? 'text-danger' : 'text-success'}
        />
        <Metric label="ROI" value={formatPercent(m.roi)} icon={Target} />
        <Metric label="Cadastros totais" value={formatNumero(m.cadastrosTotais)} icon={Users} />
        <Metric label="Depósitos totais" value={formatBRL(m.depositosTotais)} icon={Coins} />
        <Metric label="Custo / cadastro" value={m.custoPorCadastro != null ? formatBRL(m.custoPorCadastro) : '—'} icon={Target} />
        {info.modeloPagamento === 'stories' ? (
          <Metric label="Custo médio / story" value={m.custoMedioPorStory != null ? formatBRL(m.custoMedioPorStory) : '—'} icon={Film} />
        ) : (
          <Metric label="Gastos extras" value={formatBRL(m.gastosExtrasTotal)} icon={Coins} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Evolução do lucro */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do lucro</CardTitle>
            <CardDescription>Lucro por lançamento ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {serie.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={serie} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" vertical={false} />
                  <XAxis
                    dataKey="data"
                    tickFormatter={(v) => formatData(v).slice(0, 5)}
                    tick={{ fill: 'hsl(217 15% 62%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(217 15% 62%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip content={<DataTooltip />} cursor={{ stroke: 'hsl(262 83% 62%)' }} />
                  <Line
                    type="monotone"
                    dataKey="lucro"
                    name="Lucro"
                    stroke="hsl(262 83% 62%)"
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 0, fill: 'hsl(262 83% 62%)' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem lançamentos" description="Adicione um lançamento para ver a evolução." />
            )}
          </CardContent>
        </Card>

        {/* Dicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Dicas e feedbacks
            </CardTitle>
            <CardDescription>Análises automáticas da parceria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {info.dicas.map((d, i) => {
              const cfg = DICA_ICONS[d.tipo] || DICA_ICONS.info;
              const Icon = cfg.icon;
              return (
                <div key={i} className={cn('flex gap-3 rounded-xl border p-3', cfg.cls)}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.texto}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de lançamentos */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Histórico de lançamentos</CardTitle>
            <CardDescription>{m.qtdLancamentos} lançamento(s) registrado(s)</CardDescription>
          </div>
          <Button size="sm" variant="subtle" onClick={() => { setLancEdit(null); setLancOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {info.lancamentos.length === 0 ? (
            <EmptyState title="Nenhum lançamento" description="Registre o primeiro lançamento desta parceria." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 text-right font-medium">Cadastros</th>
                    <th className="px-4 py-3 text-right font-medium">Depósitos</th>
                    <th className="px-4 py-3 text-right font-medium">Rec. líquida</th>
                    <th className="px-4 py-3 text-right font-medium">%</th>
                    <th className="px-4 py-3 text-right font-medium">Pago</th>
                    <th className="px-4 py-3 text-right font-medium">Lucro</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[...info.lancamentos]
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((l) => (
                      <tr key={l.id} className="border-b border-border/60 transition-colors hover:bg-secondary/30">
                        <td className="whitespace-nowrap px-5 py-3 font-medium">{formatData(l.data)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatNumero(l.cadastros)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatBRL(l.totalDepositos)}
                          <span className="ml-1 text-xs text-muted-foreground">({l.depositos.length})</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatBRL(l.receitaLiquida)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatPercent(l.percentualAplicado)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-warning">{formatBRL(l.valorPago)}</td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-semibold tabular-nums',
                            l.lucro < 0 ? 'text-danger' : 'text-success',
                          )}
                        >
                          {formatBRL(l.lucro)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setLancEdit(l); setLancOpen(true); }}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDel(l)}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InfluenciadorForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={carregar}
        influenciador={info}
      />
      <LancamentoForm
        open={lancOpen}
        onClose={() => setLancOpen(false)}
        onSaved={carregar}
        influenciador={info}
        lancamento={lancEdit}
        participacaoGlobal={config?.minhaParticipacao}
      />
      <ConfirmDialog
        open={Boolean(confirmDel)}
        onClose={() => setConfirmDel(null)}
        onConfirm={excluirLancamento}
        title="Excluir lançamento?"
        description={confirmDel ? `Lançamento de ${formatData(confirmDel.data)} será removido permanentemente.` : ''}
      />
      <ConfirmDialog
        open={confirmDelInflu}
        onClose={() => setConfirmDelInflu(false)}
        onConfirm={excluirInfluenciador}
        title="Excluir influenciador?"
        description="Todos os lançamentos vinculados também serão removidos. Esta ação não pode ser desfeita."
      />
    </div>
  );
}

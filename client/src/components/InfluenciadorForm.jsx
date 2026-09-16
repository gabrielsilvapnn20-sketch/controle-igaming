import { useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { api } from '@/lib/api';

const MODELOS = [
  { v: 'stories', label: 'Stories (valor por post)' },
  { v: 'fixo', label: 'Fixo (recorrente)' },
  { v: 'percentual', label: 'Percentual dos depósitos' },
];

const STATUS = [
  { v: 'negociando', label: 'Negociando' },
  { v: 'fechado', label: 'Fechado' },
  { v: 'pausado', label: 'Pausado' },
];

function vazio() {
  return {
    nome: '',
    instagram: '',
    status: 'negociando',
    dataInicio: '',
    modeloPagamento: 'stories',
    percentualComissao: '',
    valorFixo: '',
    recorrencia: 'mensal',
    observacoes: '',
  };
}

export function InfluenciadorForm({ open, onClose, onSaved, influenciador }) {
  const editando = Boolean(influenciador);
  const [form, setForm] = useState(vazio());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Reinicializa quando abre.
  const [initFor, setInitFor] = useState(null);
  const chave = influenciador?.id ?? 'novo';
  if (open && initFor !== chave) {
    setForm(
      influenciador
        ? {
            nome: influenciador.nome || '',
            instagram: influenciador.instagram || '',
            status: influenciador.status || 'negociando',
            dataInicio: influenciador.dataInicio || '',
            modeloPagamento: influenciador.modeloPagamento || 'stories',
            percentualComissao: influenciador.percentualComissao ?? '',
            valorFixo: influenciador.valorFixo ?? '',
            recorrencia: influenciador.recorrencia || 'mensal',
            observacoes: influenciador.observacoes || '',
          }
        : vazio(),
    );
    setErro('');
    setInitFor(chave);
  }
  if (!open && initFor !== null) setInitFor(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) {
      setErro('O nome é obrigatório.');
      return;
    }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim(),
      instagram: form.instagram.trim(),
      status: form.status,
      dataInicio: form.dataInicio || null,
      modeloPagamento: form.modeloPagamento,
      observacoes: form.observacoes.trim() || null,
      percentualComissao: form.modeloPagamento === 'percentual' ? form.percentualComissao : null,
      valorFixo: form.modeloPagamento === 'fixo' ? form.valorFixo : null,
      recorrencia: form.modeloPagamento === 'fixo' ? form.recorrencia : null,
    };
    try {
      const saved = editando
        ? await api.updateInfluenciador(influenciador.id, payload)
        : await api.createInfluenciador(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader
        title={editando ? 'Editar influenciador' : 'Novo influenciador'}
        description="Defina o modelo de pagamento — ele determina os campos dos lançamentos."
      />
      <form onSubmit={salvar}>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={set('nome')} placeholder="Ex: Ana Souza" autoFocus />
            </div>
            <div>
              <Label>@ do Instagram</Label>
              <Input value={form.instagram} onChange={set('instagram')} placeholder="@anasouza" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={set('status')}>
                {STATUS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Início da parceria</Label>
              <Input type="date" value={form.dataInicio} onChange={set('dataInicio')} />
            </div>
          </div>

          <div>
            <Label>Modelo de pagamento *</Label>
            <Select value={form.modeloPagamento} onChange={set('modeloPagamento')}>
              {MODELOS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>

          {form.modeloPagamento === 'percentual' && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <Label>Percentual de comissão (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.percentualComissao}
                onChange={set('percentualComissao')}
                placeholder="Ex: 50"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                A cada lançamento, ela recebe esse % sobre a soma dos depósitos gerados.
              </p>
            </div>
          )}

          {form.modeloPagamento === 'fixo' && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 sm:grid-cols-2">
              <div>
                <Label>Valor fixo (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorFixo}
                  onChange={set('valorFixo')}
                  placeholder="Ex: 1500"
                />
              </div>
              <div>
                <Label>Recorrência</Label>
                <Select value={form.recorrencia} onChange={set('recorrencia')}>
                  <option value="mensal">Mensal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="semanal">Semanal</option>
                </Select>
              </div>
              <p className="col-span-full text-xs text-muted-foreground">
                O valor pago é herdado em cada lançamento, mas pode ser ajustado pontualmente.
              </p>
            </div>
          )}

          {form.modeloPagamento === 'stories' && (
            <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
              <p className="text-xs text-muted-foreground">
                No modelo <strong>stories</strong>, o valor varia a cada post. Você informa a quantidade de
                stories e o valor cobrado diretamente em cada lançamento.
              </p>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={set('observacoes')}
              placeholder="Notas sobre a parceria, condições, contatos…"
            />
          </div>

          {erro && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

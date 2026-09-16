import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import db from './db.js';
import { calcularLancamento, hidratarLancamento, agregarMetricas, round2 } from './calc.js';
import { gerarDicas } from './dicas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(compression());
app.use(express.json());

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const MODELOS = ['stories', 'fixo', 'percentual'];
const STATUS = ['negociando', 'fechado', 'pausado'];
const RECORRENCIAS = ['mensal', 'quinzenal', 'semanal'];

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function naoNegativo(valor, campo) {
  if (valor == null || valor === '') return 0;
  const n = Number(valor);
  if (Number.isNaN(n)) throw new ApiError(400, `Campo "${campo}" inválido.`);
  if (n < 0) throw new ApiError(400, `Campo "${campo}" não pode ser negativo.`);
  return n;
}

function getConfig() {
  return db.prepare('SELECT * FROM config WHERE id = 1').get();
}

function getInfluenciador(id) {
  const row = db.prepare('SELECT * FROM influenciadores WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Influenciador não encontrado.');
  return row;
}

function lancamentosDoInfluenciador(id) {
  return db
    .prepare('SELECT * FROM lancamentos WHERE influenciador_id = ? ORDER BY data ASC, id ASC')
    .all(id)
    .map(hidratarLancamento);
}

// Custo por cadastro médio de toda a agência (para comparações nas dicas).
function custoPorCadastroMedioAgencia() {
  const row = db
    .prepare('SELECT SUM(valor_pago + gastos_extras) AS invest, SUM(cadastros) AS cad FROM lancamentos')
    .get();
  if (!row || !row.cad || row.cad <= 0) return null;
  return round2(row.invest / row.cad);
}

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------
app.get(
  '/api/config',
  wrap((req, res) => {
    const cfg = getConfig();
    res.json({ minhaParticipacao: cfg.minha_participacao, atualizadoEm: cfg.atualizado_em });
  }),
);

app.put(
  '/api/config',
  wrap((req, res) => {
    const novo = Number(req.body.minhaParticipacao);
    if (Number.isNaN(novo) || novo < 0 || novo > 100) {
      throw new ApiError(400, 'A participação deve ser um número entre 0 e 100.');
    }
    const cfg = getConfig();
    const agora = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare('UPDATE config SET minha_participacao = ?, atualizado_em = ? WHERE id = 1').run(novo, agora);
      db.prepare(
        'INSERT INTO config_historico (minha_participacao, valor_anterior, alterado_em) VALUES (?, ?, ?)',
      ).run(novo, cfg.minha_participacao, agora);
    });
    tx();
    res.json({ minhaParticipacao: novo, atualizadoEm: agora });
  }),
);

app.get(
  '/api/config/historico',
  wrap((req, res) => {
    const rows = db.prepare('SELECT * FROM config_historico ORDER BY alterado_em DESC').all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        minhaParticipacao: r.minha_participacao,
        valorAnterior: r.valor_anterior,
        alteradoEm: r.alterado_em,
      })),
    );
  }),
);

// --------------------------------------------------------------------------
// Influenciadores
// --------------------------------------------------------------------------
function serializeInfluenciador(row) {
  return {
    id: row.id,
    nome: row.nome,
    instagram: row.instagram,
    status: row.status,
    dataInicio: row.data_inicio,
    observacoes: row.observacoes,
    modeloPagamento: row.modelo_pagamento,
    percentualComissao: row.percentual_comissao,
    valorFixo: row.valor_fixo,
    recorrencia: row.recorrencia,
    criadoEm: row.criado_em,
  };
}

function validarInfluenciador(body, { parcial = false } = {}) {
  const out = {};
  if (!parcial || body.nome !== undefined) {
    if (!body.nome || !String(body.nome).trim()) throw new ApiError(400, 'O nome é obrigatório.');
    out.nome = String(body.nome).trim();
  }
  if (!parcial || body.modeloPagamento !== undefined) {
    if (!MODELOS.includes(body.modeloPagamento))
      throw new ApiError(400, 'Modelo de pagamento inválido.');
    out.modeloPagamento = body.modeloPagamento;
  }
  if (body.status !== undefined) {
    if (!STATUS.includes(body.status)) throw new ApiError(400, 'Status inválido.');
    out.status = body.status;
  }
  if (body.instagram !== undefined) out.instagram = body.instagram ? String(body.instagram).trim() : null;
  if (body.dataInicio !== undefined) out.dataInicio = body.dataInicio || null;
  if (body.observacoes !== undefined) out.observacoes = body.observacoes || null;
  if (body.percentualComissao !== undefined)
    out.percentualComissao = body.percentualComissao === '' || body.percentualComissao == null
      ? null
      : naoNegativo(body.percentualComissao, 'percentualComissao');
  if (body.valorFixo !== undefined)
    out.valorFixo =
      body.valorFixo === '' || body.valorFixo == null ? null : naoNegativo(body.valorFixo, 'valorFixo');
  if (body.recorrencia !== undefined) {
    if (body.recorrencia && !RECORRENCIAS.includes(body.recorrencia))
      throw new ApiError(400, 'Recorrência inválida.');
    out.recorrencia = body.recorrencia || null;
  }
  return out;
}

app.get(
  '/api/influenciadores',
  wrap((req, res) => {
    const rows = db.prepare('SELECT * FROM influenciadores ORDER BY nome COLLATE NOCASE ASC').all();
    const resultado = rows.map((row) => {
      const lancs = lancamentosDoInfluenciador(row.id);
      const metricas = agregarMetricas(lancs);
      return { ...serializeInfluenciador(row), metricas };
    });
    res.json(resultado);
  }),
);

app.get(
  '/api/influenciadores/:id',
  wrap((req, res) => {
    const row = getInfluenciador(req.params.id);
    const lancs = lancamentosDoInfluenciador(row.id);
    const metricas = agregarMetricas(lancs);
    const dicas = gerarDicas({
      lancamentos: lancs,
      metricas,
      custoPorCadastroMedioAgencia: custoPorCadastroMedioAgencia(),
    });
    let diasParceria = null;
    if (row.data_inicio) {
      diasParceria = Math.max(
        0,
        Math.floor((Date.now() - new Date(row.data_inicio + 'T00:00:00')) / (1000 * 60 * 60 * 24)),
      );
    }
    res.json({ ...serializeInfluenciador(row), metricas, dicas, diasParceria, lancamentos: lancs });
  }),
);

app.post(
  '/api/influenciadores',
  wrap((req, res) => {
    const v = validarInfluenciador(req.body);
    const info = db
      .prepare(
        `INSERT INTO influenciadores
         (nome, instagram, status, data_inicio, observacoes, modelo_pagamento, percentual_comissao, valor_fixo, recorrencia, criado_em)
         VALUES (@nome, @instagram, @status, @dataInicio, @observacoes, @modeloPagamento, @percentualComissao, @valorFixo, @recorrencia, @criadoEm)`,
      )
      .run({
        nome: v.nome,
        instagram: v.instagram ?? null,
        status: v.status ?? 'negociando',
        dataInicio: v.dataInicio ?? null,
        observacoes: v.observacoes ?? null,
        modeloPagamento: v.modeloPagamento,
        percentualComissao: v.percentualComissao ?? null,
        valorFixo: v.valorFixo ?? null,
        recorrencia: v.recorrencia ?? null,
        criadoEm: new Date().toISOString(),
      });
    res.status(201).json(serializeInfluenciador(getInfluenciador(info.lastInsertRowid)));
  }),
);

app.put(
  '/api/influenciadores/:id',
  wrap((req, res) => {
    const atual = getInfluenciador(req.params.id);
    const v = validarInfluenciador(req.body, { parcial: true });
    const merged = {
      nome: v.nome ?? atual.nome,
      instagram: v.instagram !== undefined ? v.instagram : atual.instagram,
      status: v.status ?? atual.status,
      dataInicio: v.dataInicio !== undefined ? v.dataInicio : atual.data_inicio,
      observacoes: v.observacoes !== undefined ? v.observacoes : atual.observacoes,
      modeloPagamento: v.modeloPagamento ?? atual.modelo_pagamento,
      percentualComissao:
        v.percentualComissao !== undefined ? v.percentualComissao : atual.percentual_comissao,
      valorFixo: v.valorFixo !== undefined ? v.valorFixo : atual.valor_fixo,
      recorrencia: v.recorrencia !== undefined ? v.recorrencia : atual.recorrencia,
    };
    db.prepare(
      `UPDATE influenciadores SET
         nome=@nome, instagram=@instagram, status=@status, data_inicio=@dataInicio,
         observacoes=@observacoes, modelo_pagamento=@modeloPagamento,
         percentual_comissao=@percentualComissao, valor_fixo=@valorFixo, recorrencia=@recorrencia
       WHERE id=@id`,
    ).run({ ...merged, id: atual.id });
    res.json(serializeInfluenciador(getInfluenciador(atual.id)));
  }),
);

app.delete(
  '/api/influenciadores/:id',
  wrap((req, res) => {
    getInfluenciador(req.params.id);
    db.prepare('DELETE FROM influenciadores WHERE id = ?').run(req.params.id);
    res.status(204).end();
  }),
);

// --------------------------------------------------------------------------
// Lançamentos
// --------------------------------------------------------------------------
function validarLancamentoBase(body) {
  if (!body.data) throw new ApiError(400, 'A data do lançamento é obrigatória.');
  if (!body.influenciadorId) throw new ApiError(400, 'O influenciador é obrigatório.');
  const depositos = Array.isArray(body.depositos)
    ? body.depositos.map((v) => naoNegativo(v, 'deposito'))
    : [];
  return {
    data: String(body.data),
    cadastros: Math.trunc(naoNegativo(body.cadastros, 'cadastros')),
    depositos,
    receitaBruta: naoNegativo(body.receitaBruta, 'receitaBruta'),
    gastosExtras: naoNegativo(body.gastosExtras, 'gastosExtras'),
    observacoes: body.observacoes || null,
    quantidadeStories:
      body.quantidadeStories === '' || body.quantidadeStories == null
        ? null
        : Math.trunc(naoNegativo(body.quantidadeStories, 'quantidadeStories')),
    valorCobrado:
      body.valorCobrado === '' || body.valorCobrado == null
        ? null
        : naoNegativo(body.valorCobrado, 'valorCobrado'),
    valorPago: body.valorPago,
  };
}

app.post(
  '/api/lancamentos',
  wrap((req, res) => {
    const base = validarLancamentoBase(req.body);
    const influenciador = getInfluenciador(base.influenciadorId);
    const cfg = getConfig();
    // Percentual: puxa da config global na criação, mas aceita override manual.
    const percentualAplicado =
      req.body.percentualAplicado === '' || req.body.percentualAplicado == null
        ? cfg.minha_participacao
        : naoNegativo(req.body.percentualAplicado, 'percentualAplicado');

    const calc = calcularLancamento({ ...base, percentualAplicado }, influenciador);

    const info = db
      .prepare(
        `INSERT INTO lancamentos
         (influenciador_id, data, cadastros, depositos, receita_bruta, percentual_aplicado,
          receita_liquida, gastos_extras, valor_pago, quantidade_stories, valor_cobrado, observacoes, criado_em)
         VALUES (@influenciadorId, @data, @cadastros, @depositos, @receitaBruta, @percentualAplicado,
          @receitaLiquida, @gastosExtras, @valorPago, @quantidadeStories, @valorCobrado, @observacoes, @criadoEm)`,
      )
      .run({
        influenciadorId: influenciador.id,
        data: base.data,
        cadastros: base.cadastros,
        depositos: JSON.stringify(base.depositos),
        receitaBruta: calc.receitaBruta,
        percentualAplicado: calc.percentualAplicado,
        receitaLiquida: calc.receitaLiquida,
        gastosExtras: calc.gastosExtras,
        valorPago: calc.valorPago,
        quantidadeStories: calc.quantidadeStories,
        valorCobrado: calc.valorCobrado,
        observacoes: base.observacoes,
        criadoEm: new Date().toISOString(),
      });
    const row = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(hidratarLancamento(row));
  }),
);

app.put(
  '/api/lancamentos/:id',
  wrap((req, res) => {
    const existente = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(req.params.id);
    if (!existente) throw new ApiError(404, 'Lançamento não encontrado.');
    const base = validarLancamentoBase({ ...req.body, influenciadorId: existente.influenciador_id });
    const influenciador = getInfluenciador(existente.influenciador_id);
    // Percentual aplicado permanece editável; se não vier, mantém o histórico.
    const percentualAplicado =
      req.body.percentualAplicado === '' || req.body.percentualAplicado == null
        ? existente.percentual_aplicado
        : naoNegativo(req.body.percentualAplicado, 'percentualAplicado');

    const calc = calcularLancamento({ ...base, percentualAplicado }, influenciador);
    db.prepare(
      `UPDATE lancamentos SET
        data=@data, cadastros=@cadastros, depositos=@depositos, receita_bruta=@receitaBruta,
        percentual_aplicado=@percentualAplicado, receita_liquida=@receitaLiquida, gastos_extras=@gastosExtras,
        valor_pago=@valorPago, quantidade_stories=@quantidadeStories, valor_cobrado=@valorCobrado,
        observacoes=@observacoes
       WHERE id=@id`,
    ).run({
      id: existente.id,
      data: base.data,
      cadastros: base.cadastros,
      depositos: JSON.stringify(base.depositos),
      receitaBruta: calc.receitaBruta,
      percentualAplicado: calc.percentualAplicado,
      receitaLiquida: calc.receitaLiquida,
      gastosExtras: calc.gastosExtras,
      valorPago: calc.valorPago,
      quantidadeStories: calc.quantidadeStories,
      valorCobrado: calc.valorCobrado,
      observacoes: base.observacoes,
    });
    const row = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(existente.id);
    res.json(hidratarLancamento(row));
  }),
);

app.delete(
  '/api/lancamentos/:id',
  wrap((req, res) => {
    const existente = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(req.params.id);
    if (!existente) throw new ApiError(404, 'Lançamento não encontrado.');
    db.prepare('DELETE FROM lancamentos WHERE id = ?').run(req.params.id);
    res.status(204).end();
  }),
);

// --------------------------------------------------------------------------
// Dashboard
// --------------------------------------------------------------------------
function lancamentosNoPeriodo(inicio, fim) {
  return db
    .prepare('SELECT * FROM lancamentos WHERE data >= ? AND data <= ? ORDER BY data ASC')
    .all(inicio, fim)
    .map(hidratarLancamento);
}

app.get(
  '/api/dashboard',
  wrap((req, res) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = req.query.inicio || hoje;
    const fim = req.query.fim || hoje;

    const lancs = lancamentosNoPeriodo(inicio, fim);
    const metricas = agregarMetricas(lancs);

    // Período anterior de mesma duração para comparação.
    const dInicio = new Date(inicio + 'T00:00:00');
    const dFim = new Date(fim + 'T00:00:00');
    const duracaoDias = Math.max(1, Math.round((dFim - dInicio) / (1000 * 60 * 60 * 24)) + 1);
    const antFim = new Date(dInicio.getTime() - 1000 * 60 * 60 * 24);
    const antInicio = new Date(antFim.getTime() - (duracaoDias - 1) * 1000 * 60 * 60 * 24);
    const iso = (d) => d.toISOString().slice(0, 10);
    const lancsAnt = lancamentosNoPeriodo(iso(antInicio), iso(antFim));
    const metricasAnt = agregarMetricas(lancsAnt);

    const variacao = (atual, anterior) => {
      if (anterior === 0) return atual === 0 ? 0 : null; // null = sem base de comparação
      return round2(((atual - anterior) / Math.abs(anterior)) * 100);
    };

    // Série diária de lucro.
    const porDia = new Map();
    for (const l of lancs) {
      porDia.set(l.data, round2((porDia.get(l.data) || 0) + l.lucro));
    }
    const serieDiaria = [];
    for (let i = 0; i < duracaoDias; i++) {
      const d = new Date(dInicio.getTime() + i * 1000 * 60 * 60 * 24);
      const key = iso(d);
      serieDiaria.push({ data: key, lucro: porDia.get(key) || 0 });
    }

    // Lucro por influenciador.
    const influenciadores = db.prepare('SELECT id, nome, instagram FROM influenciadores').all();
    const nomePorId = new Map(influenciadores.map((i) => [i.id, i]));
    const porInflu = new Map();
    for (const l of lancs) {
      const cur = porInflu.get(l.influenciadorId) || { lucro: 0, receitaLiquida: 0, pago: 0 };
      cur.lucro = round2(cur.lucro + l.lucro);
      cur.receitaLiquida = round2(cur.receitaLiquida + l.receitaLiquida);
      cur.pago = round2(cur.pago + l.valorPago + l.gastosExtras);
      porInflu.set(l.influenciadorId, cur);
    }
    const lucroPorInfluenciador = [...porInflu.entries()]
      .map(([id, v]) => ({
        id,
        nome: nomePorId.get(id)?.nome || 'Desconhecido',
        instagram: nomePorId.get(id)?.instagram || null,
        lucro: v.lucro,
        roi: v.pago > 0 ? round2((v.lucro / v.pago) * 100) : null,
      }))
      .sort((a, b) => b.lucro - a.lucro);

    const prejuizos = lucroPorInfluenciador.filter((i) => i.lucro < 0).sort((a, b) => a.lucro - b.lucro);

    res.json({
      periodo: { inicio, fim },
      periodoAnterior: { inicio: iso(antInicio), fim: iso(antFim) },
      cards: {
        receitaBruta: { valor: metricas.receitaBrutaTotal, variacao: variacao(metricas.receitaBrutaTotal, metricasAnt.receitaBrutaTotal) },
        receitaLiquida: { valor: metricas.receitaLiquidaTotal, variacao: variacao(metricas.receitaLiquidaTotal, metricasAnt.receitaLiquidaTotal) },
        totalPago: { valor: metricas.totalPago, variacao: variacao(metricas.totalPago, metricasAnt.totalPago) },
        gastosExtras: { valor: metricas.gastosExtrasTotal, variacao: variacao(metricas.gastosExtrasTotal, metricasAnt.gastosExtrasTotal) },
        lucro: { valor: metricas.lucro, variacao: variacao(metricas.lucro, metricasAnt.lucro) },
      },
      metricas,
      serieDiaria,
      lucroPorInfluenciador,
      prejuizos,
    });
  }),
);

// --------------------------------------------------------------------------
// Ranking
// --------------------------------------------------------------------------
app.get(
  '/api/ranking',
  wrap((req, res) => {
    const rows = db.prepare('SELECT * FROM influenciadores').all();
    const resultado = rows
      .map((row) => {
        const lancs = lancamentosDoInfluenciador(row.id);
        const metricas = agregarMetricas(lancs);
        return { ...serializeInfluenciador(row), metricas };
      })
      .filter((i) => i.metricas.qtdLancamentos > 0);
    res.json(resultado);
  }),
);

// --------------------------------------------------------------------------
// Servir build de produção (opcional)
// --------------------------------------------------------------------------
const distDir = join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distDir, 'index.html'));
  });
}

// --------------------------------------------------------------------------
// Error handler
// --------------------------------------------------------------------------
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ erro: err.message || 'Erro interno.' });
});

app.listen(PORT, () => {
  console.log(`\n  API do Controle iGaming rodando em http://localhost:${PORT}`);
});

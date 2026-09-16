// Popula o banco com dados de exemplo. Uso: npm run seed
import db from './db.js';
import { calcularLancamento } from './calc.js';

console.log('Semeando dados de exemplo…');

const limpar = db.transaction(() => {
  db.prepare('DELETE FROM lancamentos').run();
  db.prepare('DELETE FROM influenciadores').run();
  db.prepare('DELETE FROM config_historico').run();
});
limpar();

const agora = new Date().toISOString();
const iso = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

const influenciadores = [
  {
    nome: 'Ana Souza',
    instagram: '@anasouza',
    status: 'fechado',
    data_inicio: iso(90),
    modelo_pagamento: 'percentual',
    percentual_comissao: 50,
    obs: 'Alta conversão em apostas esportivas.',
  },
  {
    nome: 'Bruno Lima',
    instagram: '@brunolima',
    status: 'fechado',
    data_inicio: iso(60),
    modelo_pagamento: 'stories',
    obs: 'Foco em stories diários.',
  },
  {
    nome: 'Carla Mendes',
    instagram: '@carlamendes',
    status: 'fechado',
    data_inicio: iso(120),
    modelo_pagamento: 'fixo',
    valor_fixo: 1500,
    recorrencia: 'mensal',
    obs: 'Contrato mensal fixo.',
  },
  {
    nome: 'Diego Rocha',
    instagram: '@diegorocha',
    status: 'pausado',
    data_inicio: iso(150),
    modelo_pagamento: 'percentual',
    percentual_comissao: 60,
    obs: 'Performance caiu, parceria pausada.',
  },
  {
    nome: 'Elisa Faria',
    instagram: '@elisafaria',
    status: 'negociando',
    data_inicio: iso(10),
    modelo_pagamento: 'stories',
    obs: 'Em fase de teste.',
  },
];

const insertInflu = db.prepare(
  `INSERT INTO influenciadores (nome, instagram, status, data_inicio, observacoes, modelo_pagamento, percentual_comissao, valor_fixo, recorrencia, criado_em)
   VALUES (@nome, @instagram, @status, @data_inicio, @obs, @modelo_pagamento, @percentual_comissao, @valor_fixo, @recorrencia, @criado_em)`,
);

const insertLanc = db.prepare(
  `INSERT INTO lancamentos (influenciador_id, data, cadastros, depositos, receita_bruta, percentual_aplicado, receita_liquida, gastos_extras, valor_pago, quantidade_stories, valor_cobrado, observacoes, criado_em)
   VALUES (@influenciador_id, @data, @cadastros, @depositos, @receita_bruta, @percentual_aplicado, @receita_liquida, @gastos_extras, @valor_pago, @quantidade_stories, @valor_cobrado, @obs, @criado_em)`,
);

const rand = (min, max) => Math.round(min + Math.random() * (max - min));

const semear = db.transaction(() => {
  for (const inf of influenciadores) {
    const info = insertInflu.run({
      percentual_comissao: null,
      valor_fixo: null,
      recorrencia: null,
      ...inf,
      criado_em: agora,
    });
    const infId = info.lastInsertRowid;
    const influData = { ...inf, id: infId, modelo_pagamento: inf.modelo_pagamento };

    const nLanc = rand(6, 12);
    for (let i = 0; i < nLanc; i++) {
      const diasAtras = rand(0, 45);
      const depositos = Array.from({ length: rand(0, 5) }, () => rand(50, 800));
      const receitaBruta = depositos.reduce((a, b) => a + b, 0) * (1 + Math.random());
      const input = {
        depositos,
        receitaBruta,
        percentualAplicado: 80,
        gastosExtras: Math.random() > 0.6 ? rand(20, 150) : 0,
      };
      if (inf.modelo_pagamento === 'stories') {
        input.quantidadeStories = rand(1, 5);
        input.valorCobrado = input.quantidadeStories * rand(80, 200);
      }
      const calc = calcularLancamento(input, influData);
      insertLanc.run({
        influenciador_id: infId,
        data: iso(diasAtras),
        cadastros: rand(0, 40),
        depositos: JSON.stringify(depositos),
        receita_bruta: calc.receitaBruta,
        percentual_aplicado: calc.percentualAplicado,
        receita_liquida: calc.receitaLiquida,
        gastos_extras: calc.gastosExtras,
        valor_pago: calc.valorPago,
        quantidade_stories: calc.quantidadeStories,
        valor_cobrado: calc.valorCobrado,
        obs: null,
        criado_em: agora,
      });
    }
  }
});
semear();

const totalInf = db.prepare('SELECT COUNT(*) c FROM influenciadores').get().c;
const totalLanc = db.prepare('SELECT COUNT(*) c FROM lancamentos').get().c;
console.log(`Pronto: ${totalInf} influenciadores e ${totalLanc} lançamentos.`);
process.exit(0);

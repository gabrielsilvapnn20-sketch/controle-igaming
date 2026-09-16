# Controle iGaming · Agência de Influenciadores

Aplicativo web **local** para controle financeiro de uma agência que conecta
influenciadores digitais a plataformas de iGaming (apostas). O foco é gerenciar a
**sua fatia** da comissão (padrão 80%), descontando o que é pago a cada influenciador
e os gastos extras, para acompanhar lucro, ROI e rentabilidade por parceria.

> Não é uma plataforma de jogos de azar — é uma ferramenta de gestão financeira da agência.

## Stack

- **Frontend:** React + Vite + TailwindCSS (componentes no estilo shadcn/ui, dark mode nativo)
- **Gráficos:** Recharts (linha, área, barras) com tooltips customizados
- **Ícones:** lucide-react
- **Backend:** Node.js + Express
- **Banco:** SQLite via `better-sqlite3` (arquivo local em `data/igaming.db`, sem serviços externos)

## Como rodar

Requisitos: **Node.js 18+** (testado no Node 22).

```bash
# 1. Instalar dependências
npm install

# 2. (opcional) Popular com dados de exemplo
npm run seed

# 3. Subir front-end e back-end juntos (um único comando)
npm run dev
```

- Front-end: http://localhost:5173
- API: http://localhost:3001 (o Vite faz proxy de `/api` automaticamente)

Abra **http://localhost:5173** no navegador.

### Build de produção (opcional)

```bash
npm run build      # gera dist/
npm start          # Express serve a API + o build estático em http://localhost:3001
```

## Modelo de dados

### Configuração global
- `minhaParticipacao` — percentual da receita bruta que fica com a agência (padrão **80%**).
- Editável a qualquer momento, com **histórico de alterações**.
- **Snapshot histórico:** alterar esse valor **não** recalcula lançamentos antigos —
  cada lançamento guarda o percentual vigente quando foi criado.

### Influenciador
Nome, @ do Instagram, status (`negociando` / `fechado` / `pausado`), data de início,
observações e **um único modelo de pagamento**:

| Modelo       | Campos                                          | Como o valor pago é calculado |
|--------------|-------------------------------------------------|-------------------------------|
| `stories`    | quantidade de stories + valor cobrado por post  | valor pago = valor cobrado; custo/story = valor ÷ qtd |
| `fixo`       | valor fixo + recorrência (mensal/quinzenal/semanal) | herdado do cadastro, editável por lançamento |
| `percentual` | percentual de comissão                          | soma dos depósitos × % / 100 (revisável) |

### Lançamento (evento financeiro por ocorrência/dia/post)
- influenciador, data, cadastros gerados, lista de depósitos (0, 1 ou vários valores)
- `receitaBruta` (informada manualmente)
- `percentualAplicado` — puxado da config global na criação, editável no lançamento
- `receitaLiquida = receitaBruta × percentualAplicado / 100` (calculado)
- `gastosExtras` (opcional) e observações
- **Lucro do lançamento = receita líquida − valor pago − gastos extras**

## Telas

- **Dashboard** — filtro de período (hoje / 7d / 30d / mês / personalizado), KPIs com
  comparação vs período anterior, evolução do lucro diário, lucro por influenciador e
  lista de parcerias no prejuízo.
- **Influenciadores** — cards com lucro acumulado, ROI e nº de lançamentos; busca e
  filtros por status/modelo; ordenação; cadastro de novo influenciador.
- **Detalhe do influenciador** — métricas (receita líquida, total pago, lucro, ROI,
  cadastros, depósitos, custo por cadastro e custo médio por story), gráfico de evolução,
  painel de **dicas automáticas** (heurísticas) e histórico de lançamentos com edição/exclusão.
- **Ranking** — pódio para o top 3, ordenável por lucro, ROI, menor custo por cadastro
  ou menor custo por story.
- **Configurações** — editar a participação global e ver o histórico de mudanças.

## Regras de negócio

- Percentual de participação nunca é recalculado retroativamente (snapshot por lançamento).
- Valores monetários em **R$** (pt-BR); datas exibidas em **dd/mm/aaaa** e armazenadas em ISO.
- Validações: data e influenciador obrigatórios; valores numéricos não-negativos.

## Estrutura

```
controle-igaming/
├── server/          # Express + better-sqlite3
│   ├── index.js     # rotas da API
│   ├── db.js        # schema e conexão SQLite
│   ├── calc.js      # regras de cálculo (receita líquida, valor pago, lucro, métricas)
│   ├── dicas.js     # heurísticas de feedback automático
│   └── seed.js      # dados de exemplo
├── client/src/      # React + Vite
│   ├── pages/       # Dashboard, Influenciadores, Detalhe, Ranking, Configurações
│   ├── components/  # UI (estilo shadcn), formulários, gráficos
│   └── lib/         # api, formatação pt-BR, utils
└── data/            # banco SQLite (criado automaticamente)
```

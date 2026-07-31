# Plano oficial do frontend

Referência oficial para todas as implementações de frontend do `gym-app`.
Consolidado em **31/07/2026**, a partir da análise do código existente e da
revisão arquitetural aprovada.

Fontes de verdade complementares:

| Documento | Papel |
| --- | --- |
| [`api.md`](api.md) | contrato da API — manda em tudo que é entrada e saída |
| [`planilha-atual.md`](planilha-atual.md) | como o professor trabalha hoje, e as dúvidas em aberto |
| [`vbt.md`](vbt.md) | base conceitual do domínio |
| **este arquivo** | como o frontend é construído |

Onde este documento divergir de `api.md`, vale `api.md` — e a divergência deve
ser corrigida aqui.

---

## 0. Inconsistências e pendências de coordenação

Registradas antes do conteúdo, por honestidade e para não se perderem.

### 0.1 Sobreposição entre as seções 4 e 10

As seções 4 ("Convenções") e 10 ("Convenções de desenvolvimento") se sobrepõem
por natureza. Resolvido assim:

- **Seção 4** — convenções **estruturais**: o que vai em qual arquivo, como se
  chama, quais arquivos de convenção do Next existem em cada rota.
- **Seção 10** — princípios de **escrita de código**: tamanho, reúso,
  acessibilidade, tipagem, abstração.

### 0.2 Arquivos compartilhados que precisam de aval do backend

Nada aqui é bloqueante, mas são alterações fora do território do frontend
(`src/app/**` exceto `api/`, e `src/components/**`):

| Arquivo | Mudança pretendida | Motivo |
| --- | --- | --- |
| `README.md` | registrar `src/features/` na seção "Divisão do trabalho" | a pasta é nova e de posse do front |
| `package.json` | instalar shadcn/ui + Recharts na E0 | decisão da seção 8; o arquivo é compartilhado |
| `components.json` | criado pelo `shadcn init` | novo arquivo de raiz, configuração do front |
| `eslint.config.mjs` | regra `no-restricted-imports` proibindo `@/lib/prisma`, `@/lib/http` e `@/generated/*` nos caminhos do front | única barreira automática contra import server-only (ver 7.4) |
| `.env.example` | **provavelmente nenhuma** | a origem do `fetch` sai de `headers()`; só entra env se essa estratégia for abandonada |

### 0.3 Posse da pasta `docs/`

`docs/` foi escrita pelo backend até aqui. Este é o primeiro documento de posse
do frontend na pasta. Manutenção deste arquivo é responsabilidade do front.

### 0.4 Pendência de infraestrutura — tokens de tema do shadcn/ui não aplicados

**Registrado em 31/07/2026, durante a instalação da infraestrutura do design
system (`components.json`, `cn`, `chart.tsx`, `card.tsx`).**

O `npx shadcn@latest init` **não completa** neste ambiente. Causa confirmada,
não hipótese: o CLI (`shadcn@4.16.1`) invoca `npm install -- <pacotes>` com uma
flag `--allow-scripts` malformada (sem lista de pacotes), que o npm 12.0.1 deste
projeto rejeita categoricamente (`EALLOWSCRIPTS`). O comportamento é
**incondicional** — mesmo com todas as dependências já instaladas manualmente,
inclusive o próprio `shadcn` como `devDependency`, uma segunda tentativa de
`init` falhou do mesmo jeito tentando "reinstalar" um pacote já presente e na
versão exata. `npm view shadcn scripts` confirma que o pacote não tem nenhum
script de instalação real — o bug é de como o CLI monta o comando, não uma
permissão genuinamente necessária.

**O que isso bloqueia especificamente:** os tokens de cor do estilo Nova
(`--background`, `--foreground`, `--primary`, `--radius`, `--chart-1..5` etc.)
não vêm de um arquivo estático — são buscados de um endpoint remoto
(`.../init?style=...&baseColor=...`) durante a execução do `init`, e escritos no
`globals.css` **depois** da etapa de instalação de dependências, que é
exatamente onde o processo quebra. `shadcn add <item> --diff` (modo dry-run,
comprovadamente seguro — não aciona o instalador) só mostra diff de arquivos de
componente, não de CSS, então não há atalho de leitura para esses valores.

**O que NÃO está bloqueado:** todo o resto da infraestrutura desta etapa foi
concluído e verificado byte a byte contra o registro via `--diff` (`components.json`
com aliases corrigidos para não colidir com `src/lib/`, `src/components/utils.ts`,
`src/components/ui/chart.tsx`, `src/components/ui/card.tsx`).

**Decisão tomada:** não contornar o bug agora. Descartado explicitamente:
declarar `shadcn` em `allowScripts` (seria uma configuração permanente só para
mascarar um defeito do CLI, não uma permissão real necessária) e tentar uma
versão anterior do CLI (reabriria a decisão já tomada de Base UI + Nova, sem
necessidade comprovada). Os tokens de tema não são necessários para validar a
infraestrutura instalada nesta etapa — só para estilizar telas reais, que ainda
não existem.

**Consequência prática, até aqui:** `src/app/globals.css` **permanece
inalterado** — sem `@import "shadcn/tailwind.css"`, sem `@layer base`, sem os
tokens de cor. Os tokens existentes (`--background`, `--foreground`, fontes
Geist, modo escuro por `prefers-color-scheme`) continuam exatamente como
estavam. `chart.tsx` e `card.tsx` referenciam classes Tailwind que dependem
desses tokens (`bg-card`, `text-muted-foreground`, `border-border` etc.) — eles
compilam e tipam normalmente, mas **não têm estilo real até os tokens existirem**.

**Isto é um bloqueio explícito para a primeira tela real (E0/`/alunos`).**
Antes de construir qualquer UI visível, uma das rotas abaixo precisa ser
resolvida — cada uma é uma decisão nova, não uma retomada automática desta:

1. Investigar por que o npm 12 deste ambiente rejeita a flag do CLI e corrigir a
   causa raiz (não o sintoma).
2. Aceitar conscientemente o custo de uma das alternativas já descartadas nesta
   rodada (`allowScripts` escopado, ou downgrade do CLI), com nova aprovação.
3. Reconstruir os tokens da Nova manualmente a partir da resposta real do
   endpoint de `init` (ex.: inspecionando a requisição de um ambiente onde o CLI
   funcione), mantendo fidelidade em vez de improvisar valores.

---

## 1. Objetivo do frontend

### 1.1 Escopo do MVP

MVP de **demonstração**, para substituir a planilha de Excel usada hoje no
CT E Perform. Cinco fluxos:

1. Cadastrar e consultar alunos.
2. Registrar avaliações periódicas manualmente.
3. Visualizar a evolução do aluno entre avaliações.
4. Gerar relatório com período padrão de 8 semanas, editável.
5. Preparar o relatório para compartilhamento por WhatsApp ou e-mail.

O produto **é o relatório**. O registro de dados é o meio — ver
`planilha-atual.md`, seção "A descoberta principal". Isso define a prioridade de
construção (seção 9).

### 1.2 Responsabilidades do frontend

- Todas as páginas em `src/app/**` (exceto `src/app/api/**`).
- Todos os componentes de interface.
- Estados de carregamento, erro, vazio, sucesso e dado parcial.
- Validação de formulário no cliente, reusando os schemas do backend.
- Formatação para exibição: datas, números, siglas, rótulos, acentuação.
- Acessibilidade e responsividade.
- Impressão do relatório e montagem do conteúdo de compartilhamento.

### 1.3 Responsabilidades do backend

- `prisma/**` — modelo de dados e migrations.
- `src/app/api/**` — route handlers.
- `src/lib/**` — regras de negócio, contratos Zod, fórmulas, textos do relatório.
- Banco de dados.

### 1.4 Limites entre as camadas

| Regra | Detalhe |
| --- | --- |
| O front **não escreve** em `prisma/`, `src/app/api/` ou `src/lib/` | Limitação encontrada vira dependência, dúvida ou recomendação registrada — nunca alteração direta |
| O front **lê dados** exclusivamente pela API HTTP | Ver 2.3 e 5.1 |
| O front **importa do domínio** apenas módulos puros | Ver seção 7 |
| O front **não reimplementa** regra de negócio | Fórmula, conversão de unidade, classificação de perfil e cálculo de score são do backend |
| O front **pode calcular** o que é apresentação | Idade a partir de `dataNascimento`, delta entre duas avaliações exibidas, filtro de lista já carregada |

---

## 2. Princípios arquiteturais

### 2.1 Server Components por padrão

Toda página, layout e componente de leitura é Server Component. O padrão só é
rompido por necessidade demonstrável, não por conveniência.

Ganhos concretos aqui: zero JavaScript para o relatório inteiro (incluindo
gráficos), busca de dados sem estado de loading manual, e nada de credenciais ou
lógica vazando para o navegador.

### 2.2 Client Components apenas quando necessários

`"use client"` é empurrado para as **folhas** da árvore. O erro caro — e a razão
desta regra existir — é marcar uma página inteira como client porque um botão
precisa de `onClick`: isso arrasta toda a subárvore para o bundle.

Quando um invólucro precisa ser client (dialog, acordeão), o conteúdo entra por
`children` já renderizado no servidor. O invólucro hidrata; o conteúdo não.

### 2.3 Consumo da API via Route Handlers

O frontend consome dados por HTTP em `/api/*`, e **não** importando `src/lib/prisma`.

Justificativa técnica (não estética): **a camada de domínio não expõe acesso a
dados**. As queries vivem dentro dos route handlers —
`prisma.aluno.findMany` está em `src/app/api/alunos/route.ts:9`, e
`historicoCmj()`/`resumirCmj()` são funções **locais e não exportadas** dentro de
`src/app/api/avaliacoes/[id]/relatorio/route.ts:98,116`. Consumir o domínio
diretamente exigiria reimplementar a montagem do relatório inteiro em território
do frontend — duplicando lógica que já existe e que vai divergir na primeira
mudança de fórmula.

Custos aceitos conscientemente:

- Um hop HTTP local por leitura (irrelevante no volume deste projeto).
- Perda de tipagem atravessando a fronteira, mitigada na seção 7.
- Necessidade de URL absoluta no servidor, tratada em 5.1.

Benefício colateral: as datas já chegam como `"AAAA-MM-DD"` — contrato
serializável, sem objetos `Date` do Prisma para converter antes de passar a
Client Components.

**Recomendação registrada ao backend (não bloqueante):** extrair um service layer
em `src/lib/` (`listarAlunos()`, `montarRelatorio()`), com os handlers virando
cascas finas. Se isso acontecer, as páginas de leitura migram uma a uma para
consumo direto, sem reescrita de interface.

### 2.4 Reutilização dos contratos existentes

Nada de redigitar regra de validação. Os schemas Zod de `src/lib/schemas.ts` são
importados e executados no cliente; os tipos de `src/lib/medidas.ts` e o catálogo
`MEDIDAS` alimentam o formulário. Detalhamento e limites na seção 7.

### 2.5 Separação entre domínio e interface

O componente não conhece regra. Ele recebe valores prontos e decide **como
mostrar**. Consequência prática, e é a que mais importa: como curva, score e
textos são declaradamente provisórios (`src/lib/calculos.ts:1-10`,
`src/lib/textos.ts:1-8`), nenhum componente pode derivar, recalcular ou assumir
faixa de valor — senão trocar a fórmula vira retrabalho de interface.

### 2.6 Filosofia feature-first

Código agrupado por **domínio** (alunos, avaliações, relatório), não por tipo
técnico (`hooks/`, `utils/`, `types/`). É a única organização que sobrevive à
entrada de filiais, importação de planilha ou textos editáveis sem
reorganização geral.

### 2.7 Simplicidade acima de abstrações desnecessárias

Regras concretas derivadas deste princípio, todas já decididas:

- Sem store global de estado.
- Sem biblioteca de data fetching no cliente.
- Sem biblioteca de formulários.
- Sem `cacheComponents` / `use cache`.
- Sem React Compiler.
- Sem geração programática de PDF (ver seção 8).

Cada uma dessas linhas pode ser revista quando houver dor concreta. Nenhuma será
revista por antecipação.

**Onde este princípio cede — decisão revisada em 31/07/2026.** Simplicidade é
meio, não fim. O fim é um MVP que valide o produto numa apresentação presencial,
onde o acabamento visual do dashboard e do relatório é parte central da
validação. Sob esse critério, o projeto **adota o shadcn/ui como sistema de
design** (seção 8), o que traz Recharts para os gráficos.

Isso não contradiz "evitar abstrações desnecessárias": o shadcn copia código-fonte
para o projeto em vez de esconder atrás de uma API, e o que ele entrega —
primitivos consistentes, acessibilidade via Radix, tokens de tema — é exatamente
o trabalho que a alternativa exigiria fazer à mão com qualidade pior. A abstração
aqui não é desnecessária; é a que evita reinventar mal.

Consequência para o plano: os primitivos de UI **não são mais extraídos da
primeira tela** — chegam prontos na E0 e são customizados conforme a necessidade
aparece.

---

## 3. Estrutura oficial de pastas

```
src/
├── app/
│   ├── layout.tsx                    root layout (existente, será ajustado)
│   ├── globals.css                   Tailwind 4 + tokens + CSS de impressão
│   ├── page.tsx                      redireciona para /alunos
│   ├── error.tsx                     boundary raiz  (Client, exigência do Next)
│   ├── not-found.tsx                 404 raiz
│   │
│   ├── alunos/
│   │   ├── page.tsx | loading.tsx | error.tsx
│   │   ├── _components/              componentes exclusivos desta rota
│   │   ├── novo/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx | loading.tsx | error.tsx | not-found.tsx
│   │       ├── editar/page.tsx
│   │       └── avaliacoes/nova/page.tsx
│   │
│   ├── avaliacoes/
│   │   └── [id]/
│   │       ├── page.tsx | loading.tsx | error.tsx
│   │       └── relatorio/
│   │           ├── page.tsx | loading.tsx | error.tsx
│   │           └── _components/
│   │
│   └── api/                          ⛔ BACKEND — não tocar
│
├── components/
│   └── ui/                           primitivos shadcn/ui (código-fonte no projeto)
│
├── features/
│   ├── shared/                       api.ts · formato.ts · erros.ts
│   ├── alunos/                       componentes · tipos · mappers
│   ├── avaliacoes/
│   └── relatorio/
│
├── lib/                              ⛔ BACKEND — só leitura, imports restritos
└── generated/prisma/                 ⛔ BACKEND — nunca importar
```

### Responsabilidade de cada pasta

| Pasta | Responsabilidade | Não deve conter |
| --- | --- | --- |
| `src/app/**` | Rotas **finas**: `await params` → busca dados → compõe features | Lógica de domínio, montagem de JSX complexo, formatação |
| `src/app/**/_components/` | Componente usado por **uma única** rota | Qualquer coisa reaproveitada em outra rota — promover para `features/` |
| `src/components/ui/` | Primitivos sem conhecimento de domínio, majoritariamente instalados via CLI do shadcn (`button`, `input`, `table`, `card`, `dialog`, `badge`, `skeleton`, `chart`, `sonner`) mais os nossos (`EmptyState`, `ErrorState`) | Menção a aluno, avaliação, medida ou relatório |
| `src/features/shared/` | `api.ts` (cliente HTTP e URL base), `formato.ts` (data, número, sigla, acentuação), `erros.ts` (status → texto em português) | Componentes visuais |
| `src/features/<domínio>/` | Componentes de domínio, tipos de resposta, mappers formulário↔DTO | Acesso direto ao Prisma, chamadas HTTP soltas (usar `shared/api.ts`) |

**Regra que impede a erosão:** se um arquivo em `src/app/**` passa de composição
e busca de dados, o excedente vai para `features/`.

**Pendência:** `src/features/` é pasta nova de topo — ver 0.2.

---

## 4. Convenções estruturais

### 4.1 Páginas

- Server Component `async` por padrão.
- **`params` e `searchParams` são Promises no Next 16** — sempre `await`.
  (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:294-305`)
- Página busca os dados e compõe; não formata nem decide regra.
- Registro não encontrado → `notFound()`, nunca renderizar vazio silencioso.
- Filtro, busca e período vivem em `searchParams`, não em estado de cliente.

### 4.2 Layouts

- `src/app/layout.tsx` mantém `lang="pt-BR"` e as fontes Geist já configuradas.
- O shell de navegação é um Server Component.
- Layout **não busca dado dinâmico**: dado não cacheado em layout bloqueia a
  navegação e não é coberto pelo `loading.tsx` do mesmo segmento
  (`.../01-getting-started/06-fetching-data.md:167-171`).

### 4.3 Componentes

- Um componente por arquivo; export nomeado.
- Props explicitamente tipadas; sem `any`; sem props booleanas empilhadas onde
  uma união de literais descreve melhor.
- Componente que precisa de interatividade recebe `"use client"` **nele**, não no
  ancestral.

### 4.4 Compartilhados × específicos de feature

| Situação | Onde vive |
| --- | --- |
| Sem domínio, reutilizável em qualquer tela | `src/components/ui/` |
| Conhece o domínio, usado em 2+ rotas | `src/features/<domínio>/` |
| Conhece o domínio, usado em 1 rota | `src/app/<rota>/_components/` |

Promover na primeira reutilização real. Não antes.

### 4.5 Nomenclatura

- Arquivos de componente: `PascalCase.tsx`.
- Módulos utilitários e de tipos: `kebab-case.ts` ou nome único minúsculo
  (`api.ts`, `formato.ts`, `tipos.ts`).
- Arquivos de convenção do Next em minúsculo: `page`, `layout`, `loading`,
  `error`, `not-found`.
- **Código e identificadores em português**, acompanhando o backend
  (`medidasParaLinhas`, `siglaComLado`). Sem mistura de idiomas dentro de um nome.
- Sem acento e sem cedilha em nomes de arquivo, variável ou pasta. Acento existe
  em **texto de interface**, sempre.

### 4.6 Organização dos arquivos

Ordem dentro de um arquivo: imports → tipos → componente principal →
subcomponentes locais → helpers locais. Helper usado por dois arquivos sobe para
o módulo da feature.

### 4.7 Tratamento de erros

Três níveis, distintos de propósito:

| Nível | Mecanismo | Uso |
| --- | --- | --- |
| **Esperado** | valor de retorno da ação + `useActionState` | 422 de validação, 409 de duplicata, 404 em mutação |
| **Inesperado em render** | `error.tsx` do segmento | API fora do ar, resposta malformada |
| **Ausência** | `notFound()` + `not-found.tsx` | Aluno ou avaliação que não existe |

Regras invioláveis:

- **Nunca exibir o campo `error` cru da API.** As mensagens do backend são sem
  acento (`"Aluno nao encontrado"`, `"Dados invalidos"`) — `src/lib/http.ts:45-77`.
  Traduzir por status em `features/shared/erros.ts`.
- **Exceção:** `issues[].message` do Zod é específico e útil
  (`"Nome precisa de pelo menos 2 letras"`) — exibir como veio.
- `error.tsx` é obrigatoriamente Client Component
  (`.../01-getting-started/10-error-handling.md:212`) e sempre oferece nova tentativa.
- Erro nunca é beco sem saída: sempre há ação de retorno ou de repetição.

### 4.8 Loading

- `loading.tsx` por segmento que busca dados.
- Esqueleto com a forma do conteúdo real — não spinner genérico, não texto
  "Carregando..." solto.
- Em mutação: `pending` do `useActionState` desabilita o botão e rotula a ação.
- Nada de layout shift entre esqueleto e conteúdo.

### 4.9 Not-found

- `not-found.tsx` no segmento de detalhe (`alunos/[id]`, `avaliacoes/[id]`) e na raiz.
- Sempre com caminho de volta para a listagem correspondente.

### 4.10 Estilos

- Tailwind 4, configuração CSS-first no `globals.css` (não há `tailwind.config.js`).
- **Tokens de tema são os do shadcn/ui**, escritos em `globals.css` pelo `shadcn init`
  (paleta em OKLCH, variantes clara e escura). Customização de identidade visual é
  feita **nesses tokens**, não em classe solta de componente.
- Nada de valor mágico repetido em componente.
- **Corrigir na E0:** `src/app/globals.css:25` define
  `body { font-family: Arial, Helvetica, sans-serif }`, sobrescrevendo a fonte
  Geist carregada em `src/app/layout.tsx:5-13`. As variáveis existem e não são aplicadas.
- Dark mode por `prefers-color-scheme` já está montado — manter.
- CSS de impressão (`@media print`) é entregável de primeira classe na E3, não
  polimento final.

---

## 5. Estratégia de dados

### 5.1 Como consumir a API

Um único ponto de contato: `src/features/shared/api.ts`.

- **Origem no servidor:** derivada de `headers()`. Isso resolve a exigência de URL
  absoluta em `fetch` de Server Component e, de quebra, torna a rota dinâmica —
  impedindo que o build tente prerenderizar uma página que depende de um servidor
  ainda não no ar. Env var fica como plano B para deploy.
- **No cliente:** caminho relativo `/api/...`, sem origem.
- Retorno discriminado: sucesso com dado, ou falha com status, mensagem
  traduzida e `issues` quando houver.
- **`DELETE` responde 204 com corpo vazio** — nunca chamar `res.json()` nele
  (`src/app/api/alunos/[id]/route.ts:70`).
- Deduplicação intra-requisição com `cache()` do React quando a mesma leitura
  ocorrer em mais de um ponto da árvore.

### 5.2 Quando usar Server Components

Padrão para tudo: páginas, shell, tabelas de leitura, seções do relatório,
**gráficos**, tudo que só exibe.

### 5.3 Quando usar Client Components

Lista fechada para o MVP — qualquer adição precisa de justificativa:

| Componente | Motivo |
| --- | --- |
| `error.tsx` / `global-error.tsx` | exigência do framework |
| Formulário de aluno | `useActionState` |
| Formulário de avaliação | `useActionState` + lista dinâmica de linhas |
| Busca de alunos | filtro no cliente com normalização de acento |
| `ConfirmDialog` | interação |
| Barra de compartilhamento | `window.print`, `mailto`, `wa.me` |
| Seletor de período | **só se** for interativo; um `<form method="get">` mantém Server |
| **Gráficos** | Recharts exige `"use client"` — decisão consciente da seção 8 |
| Primitivos shadcn com estado (`Dialog`, `Select`, `Tabs`, `Sonner`) | Radix é client por natureza. `Card`, `Table`, `Badge` e `Skeleton` permanecem Server |

### 5.4 Cache

- **Sem cache adicional.** `fetch` não é cacheado por padrão no Next 16
  (`.../06-fetching-data.md:63`) — comportamento correto para dado de avaliação.
- Sem `cacheComponents`, sem `use cache`, sem `revalidate`.
- `cache()` do React apenas para dedupe dentro de uma mesma requisição.
- **Catálogo de medidas:** importado de `@/lib/medidas` (módulo puro, estático).
  Elimina uma chamada e um estado de loading, e dá tipagem literal. `GET /medidas`
  permanece o contrato oficial — se o catálogo virar dinâmico, muda-se um arquivo.
  Decisão a confirmar com o backend (seção 12, D6).

### 5.5 Revalidação

- Após mutação bem-sucedida: `router.refresh()`, depois `redirect` quando houver
  troca de tela.
- Sem tags de cache, portanto sem `revalidateTag` / `updateTag`.
- Atenção a contadores derivados (`totalAvaliacoes` na lista de alunos): conferir
  visualmente que o refresh os atualiza após criar ou excluir avaliação.

### 5.6 Loading

Ver 4.8. Três instrumentos: `loading.tsx` (navegação), `pending` (mutação),
`<Suspense>` (só se alguma seção provar ser lenta — não previsto).

### 5.7 Erros

Ver 4.7. Mapeamento de referência (`src/lib/http.ts:45-77`):

| Status | Origem | Tratamento no front |
| --- | --- | --- |
| 400 | JSON inválido | Erro genérico — indica bug do front |
| 404 | `naoEncontrado()` ou Prisma P2025 | `notFound()` em leitura; mensagem em mutação |
| 409 | Prisma P2002, **sem indicar campo** | Prevenir antes de enviar (6.6); mensagem específica por contexto |
| 422 | Zod | Mapear `issues[].field` para os campos (6.4) |
| 500 | não tratado | Erro genérico + nova tentativa |

---

## 6. Estratégia de formulários

### 6.1 FormData

Todo formulário submete via `FormData`. Extração no submit
(`Object.fromEntries` para os campos simples, leitura indexada para os arrays de
teste e tentativa), sem espelhar cada campo em estado.

### 6.2 Formulários não-controlados

Inputs com `defaultValue`. O estado React guarda **apenas a identidade das
linhas** (ids de teste e de tentativa); os valores vivem no DOM.

Consequência que motivou a decisão: digitar **não re-renderiza nada**. Um
formulário controlado re-renderizaria o array inteiro de testes a cada tecla — no
formulário mais longo do sistema, preenchido em tablet.

Ressalva conhecida: input não-controlado embaralha valores se as linhas forem
reordenadas. **Não é problema aqui:** `ordem` é campo explícito do DTO
(`src/lib/schemas.ts:51`), então não existe UI de arrastar-e-soltar. Adicionar e
remover com chaves estáveis por id é seguro.

### 6.3 Validação compartilhada com Zod

- `criarAlunoSchema` e `criarAvaliacaoSchema` são importados de `@/lib/schemas` e
  executados no cliente com `safeParse` antes do envio. Mesma regra, um lugar só.
- HTML nativo (`required`, `min`, `step`, `type="date"`) como primeira camada.
- O servidor continua sendo a autoridade final.
- **Zod 4 está instalado.** Usar `error.issues` / `z.flattenError` — `flatten()`
  está depreciado, e o backend já usa `issues` (`src/lib/http.ts:53-57`).

Regras que só o front pode garantir:

- Enviar **as 5 chaves de `medidas` sempre**, com `null` nos campos vazios.
- **Campo vazio nunca vira `0`.** `planilha-atual.md:139-141` registra
  "zero significando não medido" como bug herdado da planilha. A interface
  combate isso ativamente, inclusive no texto de apoio.
- Teste adicionado precisa de ao menos uma tentativa antes do envio.

### 6.4 Tratamento de 422

A resposta traz `issues: [{ field, message }]`, onde `field` é o caminho pontilhado
do Zod (`src/lib/http.ts:55`): `medidas.cmj.valor`,
`testes.0.tentativas.1.carga.valor`.

Os atributos `name` dos inputs seguem **exatamente esse formato**, de modo que o
mapeamento erro→campo é direto. Comportamento exigido: mensagem sob o campo,
foco no primeiro campo com erro, e resumo com `aria-live` no topo quando houver
mais de um.

### 6.5 Rascunhos locais

O formulário de avaliação persiste rascunho em `localStorage`, com chave por
aluno, gravado com _debounce_ e limpo no sucesso.

Motivo: é o formulário mais longo do sistema, preenchido em tablet à beira da
quadra. Perder o preenchimento é o pior defeito de experiência possível neste
produto. Custo baixo, valor alto.

Ao retomar, avisar que existe rascunho e permitir descartar — nunca restaurar em
silêncio.

### 6.6 Prevenção de duplicidades

`api.md:137` descreve unicidade de `codigo` de teste e de `ordem` de tentativa
como regra de validação, mas **o Zod não valida isso** (`src/lib/schemas.ts:57-71`):
é constraint de banco (`prisma/schema.prisma:71,89`) e a violação retorna **409
genérico, sem indicar campo**.

Portanto o front **impede antes de enviar**: código de teste duplicado e ordem de
tentativa duplicada são bloqueados com mensagem no campo.

Também: `POST /alunos` **aceita nome duplicado** (não há `@@unique` em
`Aluno.nome`). O front **avisa** ("já existe um aluno com esse nome") sem
bloquear — homônimo é legítimo, e numeração/duplicidade manual já é dor conhecida
do professor (`planilha-atual.md:132-135`).

---

## 7. Estratégia de tipagem

### 7.1 Tipos reutilizados

**Entrada** (`src/lib/schemas.ts:100-105`): `CriarAvaliacaoDTO`, `MedidasDTO`,
`TesteDTO`, `TentativaDTO`, `CriarAlunoDTO`, `AtualizarAlunoDTO`.

**Catálogo** (`src/lib/medidas.ts`): `DefinicaoMedida`, `ChaveMedida`, `Lado`, e em
runtime `MEDIDAS`, `siglaComLado`, `rotuloComLado`, `SUFIXO_LADO`.

**Relatório**: `MedidaDetalhada` (`src/lib/avaliacoes.ts:68`), `PontoCurva` e
`AjusteCurva` (`src/lib/calculos.ts:47,54`), `TextosRelatorio` (`src/lib/textos.ts:16`).

**Saída de avaliação**: derivada de `ReturnType<typeof serializarAvaliacao>`
(`src/lib/avaliacoes.ts:158`). É `import type` — custo zero em runtime — e faz o
`npm run typecheck` quebrar se o backend mudar o formato.

### 7.2 Módulos que podem ser importados

| Módulo | Uso | Por quê é seguro |
| --- | --- | --- |
| `@/lib/medidas` | tipo **e runtime** | funções e constantes puras, sem dependência externa |
| `@/lib/schemas` | tipo **e runtime** | depende só de `zod` e de um `import type` |
| `@/lib/avaliacoes` | **somente tipo** | puro, mas não há motivo de runtime no front |
| `@/lib/calculos` | **somente tipo** | fórmulas são do backend (2.5) |
| `@/lib/textos` | **somente tipo** | — |

### 7.3 Módulos proibidos

| Módulo | Motivo |
| --- | --- |
| `@/lib/prisma` | instancia `PrismaClient` com adapter nativo better-sqlite3 |
| `@/lib/http` | importa `Prisma` de `@/generated/prisma/client`, arrastando o client inteiro |
| `@/generated/prisma/**` | artefato de build do backend |

### 7.4 Como evitar imports server-only

**O pacote `server-only` não está instalado** — não há barreira de contrato. O
bundler provavelmente falha ao encontrar o módulo nativo, mas depender disso é
frágil.

Barreiras, em ordem:

1. **`no-restricted-imports` no ESLint**, escopada aos caminhos do front, com a
   lista de 7.3. Falha em `npm run lint`, antes de qualquer runtime.
   Pendente de aval (0.2).
2. `npm run build` no ciclo desde a E0 — expõe violação de fronteira RSC/Client.
3. Revisão: qualquer import novo de `@/lib/*` em arquivo com `"use client"` é
   ponto de atenção obrigatório no PR.

### 7.5 Evitando acoplamento excessivo

Trade-off assumido conscientemente: derivar de `ReturnType<typeof serializarAvaliacao>`
acopla o front a uma **função de implementação** do backend, não ao contrato HTTP.
Em troca, a divergência é detectada em tempo de compilação em vez de virar
`undefined` na tela.

Mitigação: **um `tipos.ts` por feature**. A superfície de acoplamento é um arquivo
por domínio, não trinta componentes. Se o backend mudar, um arquivo se move.

Pedido registrado ao backend: exportar um tipo `RelatorioResponse` — é o único
ponto onde o front precisa declarar o envelope à mão (seção 12, D7).

---

## 8. Estratégia de visualização e do relatório

> **Seção revisada em 31/07/2026.** A versão anterior recomendava SVG manual em
> Server Components e nenhuma biblioteca de gráficos. A prioridade do MVP foi
> reformulada: ele será apresentado presencialmente a um cliente, e o acabamento
> visual do dashboard e do relatório é parte central da validação. Sob esse
> critério, a decisão de gráficos se inverte. A decisão do relatório se mantém,
> agora com evidência mais forte. O histórico fica registrado em 8.6.

São **dois** gráficos: evolução do CMJ (≤21 pontos) e curva carga×velocidade
(≤8 pontos, mais a reta do ajuste, já calculada em `curva.ajuste`). Eles aparecem
em **duas superfícies com requisitos diferentes** — e é essa diferença que
organiza toda a seção:

| Superfície | Requisito dominante |
| --- | --- |
| Dashboard / tela | Interatividade e acabamento. Passar o mouse e ver o valor é um momento da apresentação |
| Relatório impresso | Layout determinístico. O que sai no papel tem que ser previsível |

### 8.1 Decisão: shadcn/ui Charts (Recharts 3)

**Adotado.** E, junto com ele, o **shadcn/ui como sistema de design do projeto**.

Isso não é um detalhe de implementação — é a consequência técnica central da
escolha. Não existe usar "só o gráfico do shadcn": o `ChartContainer` depende do
`components.json`, do util `cn`, das CSS vars de tema e do Radix. **Escolher
shadcn Charts é adotar a fundação do shadcn.**

E é justamente por isso que a decisão compensa: pago o custo uma vez e o **custo
marginal de usar `Card`, `Table`, `Badge`, `Dialog` e `Skeleton` passa a ser
zero**. O ganho de acabamento não fica restrito aos dois gráficos — alcança o
dashboard inteiro, que é metade do que será demonstrado.

**Versões verificadas em 31/07/2026:**

| Item | Versão / estado |
| --- | --- |
| `recharts` | **3.10.1**, peer `react: ^19.0.0` ✅ |
| shadcn/ui `chart` | usa **Recharts v3**; componentes exigem `"use client"` |
| shadcn/ui + Tailwind v4 | suportado; `init` escreve os tokens em `globals.css` (OKLCH) |
| shadcn/ui + React 19 | suportado; `forwardRef` removido, `data-slot` em cada primitivo |

**Custo assumido conscientemente:** Recharts 3 traz dependências pesadas
(`@reduxjs/toolkit`, `react-redux`, `immer`, `victory-vendor`/d3 — 7,4 MB
desempacotados; na casa das centenas de kB gzipadas no navegador, a confirmar na
E3). Num sistema com ~50 usuários, uso interno e sem restrição de performance,
esse custo é **irrelevante diante do ganho de validação do produto**. Registrar o
número real no PR da E3.

### 8.2 Um componente, duas configurações

O mesmo componente de gráfico serve às duas superfícies — **não haverá duas
implementações**. Seria repetir exatamente a duplicação que faz o
`@react-pdf/renderer` ser recusado em 8.4.

| | Dashboard | Relatório |
| --- | --- | --- |
| Dimensionamento | `responsive` (Recharts 3.3+) com `aspectRatio` | **largura e altura fixas**, casadas com a área útil do A4 |
| Animação | ligada | **desligada** (`isAnimationActive={false}`) |
| Tooltip | ativo | dispensável; rótulo direto no ponto |

**Por que largura fixa no relatório.** `ResponsiveContainer` e o modo `responsive`
dimensionam pelo **viewport**, não pela página impressa: no momento da impressão
o SVG já foi calculado para a tela, e não há garantia de que o observador de
redimensionamento dispare antes da captura. Largura fixa elimina a incerteza.

**Por que animação desligada no relatório.** Recharts anima na montagem; imprimir
durante a animação captura o gráfico pela metade. É a pegadinha clássica desta
combinação, e está no checklist da E3.

### 8.3 Decisão do relatório: HTML/Tailwind + CSS de impressão

**Opção A adotada para o MVP.** O relatório é uma página HTML normal, estilizada
com Tailwind e com um bloco `@media print` dedicado, convertida em PDF pelo
próprio navegador (`window.print()`).

Vantagens que pesaram: uma única árvore de componentes, um único sistema de
estilo, um único conjunto de gráficos, responsividade de graça na tela, e
acessibilidade real (é HTML). Custo: a paginação depende do motor do navegador —
controlável com `break-inside: avoid` e testes, mas não milimétrica.

### 8.4 Por que `@react-pdf/renderer` não entra agora

Avaliado na versão **4.5.1** (peer `react: ^19.0.0` ✅). Recusado para o MVP por
três motivos técnicos, não por preconceito contra a dependência:

1. **Sistema de estilo próprio.** Usa uma `StyleSheet` API própria — **não aceita
   CSS nem Tailwind**. O documento PDF seria uma árvore de componentes
   completamente separada, escrita em outra linguagem de estilo. Duplicação de
   100% do relatório, com divergência garantida na primeira alteração.
2. **Primitivos SVG próprios.** Os gráficos precisariam de uma **terceira**
   implementação, além do Recharts na tela.
3. **A geração no servidor é território do backend.** `renderToStream` /
   `renderToBuffer` exigem um Route Handler em `src/app/api/**` — fora do meu
   escopo. Só a geração no cliente (`PDFDownloadLink`, `usePDF`) caberia aqui, e
   ela carrega o renderizador inteiro para o navegador (ordem de 1 MB) só para
   produzir o mesmo arquivo que `Ctrl+P` produz de graça.

O ganho real sobre imprimir-para-PDF — paginação determinística, cabeçalho e
rodapé com número de página, fontes embutidas — não paga esse preço num MVP de
demonstração.

### 8.5 Como fica preparado como evolução (opção C)

Sem escrever uma linha a mais hoje, três restrições de desenho mantêm a porta
aberta:

1. **Seções do relatório recebem dados normalizados por props** e não buscam nada
   por conta própria. Uma futura árvore PDF consome exatamente os mesmos dados.
2. **Nenhuma derivação de número dentro de componente de apresentação** (já é
   regra em 2.5). O que o PDF precisaria recalcular, ninguém recalcula.
3. **A montagem do conteúdo de compartilhamento fica isolada** em
   `features/relatorio/`, não espalhada na página.

**Gatilho explícito para reabrir a decisão:** se **B3** resolver como "PDF
anexado automaticamente ao e-mail", isso deixa de ser trabalho de frontend e vira
`renderToStream` em Route Handler — ou seja, **dependência de backend**, a ser
registrada na seção 12, não uma mudança deste plano.

### 8.6 Alternativas avaliadas e recusadas

| Alternativa | Veredito |
| --- | --- |
| **SVG manual em RSC** (recomendação anterior) | Tecnicamente sólida e ainda a melhor em bundle e impressão. Recusada porque entrega menos acabamento por hora investida, e acabamento virou requisito de produto. Continua sendo o plano B se o Recharts decepcionar na impressão |
| **`d3-scale` / `d3-shape` puros no servidor** | Faziam sentido como apoio ao SVG manual. Sem propósito agora que o Recharts entrou |
| **Visx** | Bom meio-termo entre controle e ergonomia, mas sem os primitivos de UI que acompanham o shadcn — perde no critério que passou a decidir |
| **Chart.js** | Recusado por mérito técnico: canvas rasteriza na impressão e não expõe DOM para leitor de tela. Falha nos dois requisitos mais importantes aqui |
| **`@react-pdf/renderer` desde a v1 (opção B)** | Ver 8.4 |
| **Híbrido: relatório web + PDF separados** | É a opção B com outro nome, e carrega a duplicação como característica permanente. Recusado |

### 8.7 Acessibilidade dos gráficos

O Recharts renderiza SVG no DOM, então a base é melhor que canvas — mas não
basta. Mantém-se como obrigatório, sem exceção:

- `role="img"` com nome acessível descrevendo o que o gráfico mostra.
- **Tabela textual equivalente** ao lado de cada gráfico. Já era exigência do
  relatório impresso e continua sendo o caminho real para leitor de tela.
- Nenhuma informação transmitida **só** por cor: forma, rótulo ou padrão junto.
- Contraste conferido em tema claro e escuro.

---

## 9. Plano oficial de implementação

Princípios do sequenciamento:

1. **Uma fatia vertical primeiro**, para validar a arquitetura inteira numa tela real.
2. **O relatório cedo**, porque é o produto — `planilha-atual.md:23`. Viável porque
   `prisma/seed.ts` já popula 3 alunos com histórico: telas de leitura podem ser
   construídas e demonstradas antes de existir qualquer formulário.
3. **Fundação visual instalada antes da primeira tela** (revisado — ver 2.7): os
   primitivos chegam prontos pelo shadcn/ui na E0, e são customizados conforme a
   necessidade real aparece.
4. **O que depende de decisão externa fica isolado no fim** (E7).

Trade-off assumido: entre E0 e E4 não se cria dado pela interface. O seed cobre.

---

### E0 — Andaime e fatia vertical

**Objetivo.** Instalar a fundação visual e validar a arquitetura inteira numa
tela real.

**Entregáveis.** Inicialização do shadcn/ui (`components.json`, tokens em
`globals.css`, util `cn`) e instalação dos primitivos da primeira tela; shell de
navegação; `features/shared/{api,formato,erros}.ts`; `features/alunos/tipos.ts`;
`/alunos` completo (lista, busca, filtro ativo/inativo, vazio, erro, loading);
`error.tsx` e `not-found.tsx` raiz; `/` redirecionando; correção da fonte no
`globals.css`.

**Critérios de aceite.**
- `typecheck`, `lint` e `build` limpos.
- Tema shadcn aplicado, em claro e escuro, sem conflito com os tokens que já
  existiam no `globals.css`.
- Fonte Geist preservada após a escrita dos tokens pelo `shadcn init`.
- Primitivos com estado (`Dialog`, `Select`) isolados como Client Components; a
  página permanece Server.
- Os 3 alunos do seed aparecem com `totalAvaliacoes`.
- Buscar "ana" e "Aná" encontra "Ana Prado" (normalização de acento).
- Filtro ativo/inativo reflete na URL e sobrevive a refresh.
- Banco vazio e busca sem resultado produzem estados **distintos**.
- API fora do ar mostra erro com nova tentativa, não tela branca.
- Fonte Geist efetivamente aplicada.
- Nenhum arquivo de `prisma/`, `src/app/api/` ou `src/lib/` alterado.

**Dependências.** Aprovação para instalar o shadcn/ui e suas dependências
(altera `package.json` — ver 0.2). Aval dos demais itens de 0.2 é desejável, não
bloqueante.

> **Estado em 31/07/2026:** `components.json`, `cn` (`src/components/utils.ts`)
> e os primitivos `chart.tsx`/`card.tsx` já foram instalados como etapa de
> infraestrutura, à parte da fatia vertical `/alunos`. **Os tokens de tema
> continuam pendentes** — ver 0.4. Isso bloqueia o critério de aceite "Tema
> shadcn aplicado, em claro e escuro" desta etapa até ser resolvido.

---

### E1 — Ficha do aluno e histórico

**Objetivo.** Segunda tela de leitura; consolidar os primitivos extraídos na E0.

**Entregáveis.** `/alunos/[id]` com dados, idade (quando houver data de
nascimento), histórico de avaliações em tabela com as **siglas do professor**
(`TOR DIR`, `SLB ESQ`, `CMJ`) e delta em relação à avaliação anterior; estado
vazio com chamada para a primeira avaliação; `loading`, `error`, `not-found`.

**Critérios de aceite.**
- Avaliações em ordem decrescente por data.
- Datas exibidas **batem com as retornadas** (sem deslocamento de fuso).
- Medida não preenchida aparece como "—", nunca "0".
- ID inexistente cai em 404 tratado.
- Aluno sem avaliações mostra estado vazio útil.

**Dependências.** E0.

---

### E2 — Relatório v1, sem gráficos

**Objetivo.** Antecipar o maior risco de produto: colocar o relatório na frente
do professor o quanto antes.

**Entregáveis.** `/avaliacoes/[id]/relatorio` com todas as seções que a API
entrega — resumo de CMJ, curva (em tabela), análise técnica, medidas detalhadas,
score, textos —, tratamento de `ajuste: null`, `resumoCmj: null` e
`cargaMaximaKg: null`, e o aviso de provisoriedade a partir do objeto `provisorio`
da resposta.

**Critérios de aceite.**
- Relatório de "Ana Prado" (8 avaliações no seed) renderiza inteiro.
- Avaliação sem testes renderiza sem quebrar: perfil "Dados insuficientes",
  score "Sem dados".
- Aluno sem CMJ não quebra o resumo.
- Rótulos com acentuação correta, inclusive `perfil` e `nivel` (o backend devolve
  `"Orientado a forca"` — `src/lib/calculos.ts:127`).
- `variacaoVsInicial` e `variacaoVsPico` rotulados em **cm**, não em %
  (são diferenças absolutas — `.../relatorio/route.ts:127-128`).
- `periodo.totalAvaliacoes` **não** rotulado como "total de avaliações"
  (conta só as que têm CMJ — ver seção 11, R6).
- Aviso de provisoriedade visível, sem alarmismo.

**Dependências.** E0. Conhecimento de B2 é desejável, mas a etapa entrega o que a
API já expõe independentemente da resposta.

---

### E3 — Gráficos e impressão

**Objetivo.** Tornar o relatório demonstrável de verdade.

**Entregáveis.** `GraficoCmj` (linha) e `GraficoCurva` (dispersão + reta do
ajuste), ambos sobre shadcn/ui Charts (Recharts 3), num único componente por
gráfico com as duas configurações de 8.2; tabela textual equivalente a cada
gráfico; CSS de impressão (A4, sem navegação, quebras entre seções).

**Critérios de aceite.**
- Impressão gera página limpa em A4, com os gráficos **completos e nítidos**.
- **Gráficos conferidos na pré-visualização de impressão**, não só na tela — é o
  risco específico desta etapa (R7).
- Animação desligada na instância do relatório; nenhum gráfico cortado ao imprimir.
- Cada gráfico tem alternativa textual e nome acessível (8.7).
- Nenhuma informação transmitida apenas por cor.
- Eixos sem escala fixa em código — derivados sempre dos dados.
- Curva sem ajuste (`ajuste: null`) renderiza os pontos sem a reta, sem quebrar.
- Custo real de bundle do Recharts medido e registrado no PR (8.1).

**Dependências.** E2.

---

### E4 — Formulário de aluno

**Objetivo.** Provar o padrão de formulário no caso simples antes do caso difícil.

**Entregáveis.** `/alunos/novo` e `/alunos/[id]/editar`; inativar; excluir com
`ConfirmDialog` nomeando o impacto; aviso de nome duplicado; `useActionState`
com `pending`; mapeamento de 422.

**Critérios de aceite.**
- Nome com 1 letra é barrado no cliente e, se forçado, exibe a mensagem do 422
  sob o campo.
- Sucesso volta à lista **já com o aluno visível** (refresh confirmado).
- Excluir pede confirmação citando o número de avaliações que serão perdidas.
- Botão desabilita durante o envio; sem duplo submit.
- Nome duplicado avisa sem bloquear.

**Dependências.** E0.

---

### E5 — Formulário de avaliação

**Objetivo.** Entregar o fluxo central de escrita. Etapa maior, mas coesa — o
formulário tem um único submit e um único modelo de dados; dividi-lo produziria
uma entrega não revisável.

**Entregáveis.** `/alunos/[id]/avaliacoes/nova`; medidas geradas a partir do
catálogo; campos decimais em pt-BR; array dinâmico de testes e tentativas;
prevenção de duplicidade; rascunho local; valor da avaliação anterior como
referência somente-leitura ao lado de cada campo; criação de aluno inline;
submit com mapeamento de 422.

**Critérios de aceite.**
- Todos os 9 campos de medida aceitam vazio, e o payload envia `null` — nunca `0`
  nem `""`.
- `"11,5"` e `"11.5"` produzem ambos `11.5`.
- As 5 chaves de `medidas` estão sempre presentes no payload.
- Digitar em qualquer campo **não** re-renderiza o array de testes.
- Adicionar/remover teste e tentativa preserva os valores já digitados.
- Código de teste duplicado e ordem duplicada são barrados antes do envio.
- Teste sem tentativa é barrado.
- Um 422 forçado marca exatamente o campo de `issues[].field`, com foco no primeiro.
- Fechar e reabrir a página oferece o rascunho, com opção de descartar.
- Data padrão é hoje, sem deslocamento de fuso.
- Usável em tablet: alvos de toque grandes, teclado numérico.

**Dependências.** E4. **Atenção:** se a resposta de B2 confirmar a hipótese
Samozino, entram campos novos (massa corporal, altura de salto) — ver seção 11, R2.

---

### E6 — Detalhe da avaliação

**Objetivo.** Fechar o ciclo de escrita e provar o round-trip do contrato.

**Entregáveis.** `/avaliacoes/[id]` com medidas em tabela (siglas do professor),
testes e tentativas, exclusão com confirmação, atalho para o relatório.

**Critérios de aceite.**
- O que foi digitado na E5 aparece idêntico.
- Medidas não medidas como "—".
- Excluir pede confirmação e volta para a ficha do aluno, com a lista atualizada.

**Dependências.** E5.

---

### E7 — Período e compartilhamento

**Objetivo.** Fechar os fluxos 4 e 5.

**Entregáveis.** Seletor de período (padrão 8 semanas, editável, refletido na
URL); botão de impressão/PDF; compartilhamento por WhatsApp (`wa.me`) e e-mail
(`mailto`) com resumo montado no cliente.

**Critérios de aceite.**
- Período reflete na URL e o link compartilhado reproduz a mesma visão.
- A tela deixa **explícito** o que a janela afeta e o que permanece histórico completo.
- WhatsApp e e-mail abrem preenchidos.
- Nenhum dado pessoal sai para serviço externo sem ação explícita do usuário.

**Dependências.** **B1 e B3** (seção 12). Isolada de propósito no fim por isso.

---

### E8 — Acessibilidade, responsividade e polimento

**Objetivo.** Qualidade de entrega.

**Entregáveis.** Passada completa de acessibilidade, responsividade tablet-first
(360 px → desktop), revisão de textos, revisão de todos os estados.

**Critérios de aceite.**
- Navegação completa por teclado, com foco visível e ordem lógica.
- Erros anunciados por leitor de tela (`aria-live`).
- Sem scroll horizontal em 360 px; tabelas largas rolam no próprio contêiner.
- Contraste conferido em claro e escuro.
- Todos os estados vazio/erro/loading revisados com o vocabulário do professor.

**Dependências.** E0–E7.

---

## 10. Convenções de desenvolvimento

- **Componentes pequenos.** Se um arquivo passa de ~150 linhas ou faz mais de uma
  coisa, dividir. Formulários são a exceção tolerada, e ainda assim os campos
  saem em subcomponentes.
- **Reúso antes de duplicação — mas só na segunda ocorrência.** Primeira: escreve
  onde precisa. Segunda: promove (4.4). Não antes.
- **Acessibilidade não é etapa final.** Todo campo com `<label>` associado; todo
  botão com nome acessível; todo erro com `aria-live`; toda tabela com `caption`
  e `scope`; todo gráfico com alternativa textual. A E8 é revisão, não construção.
- **Responsividade tablet-first.** O material do cliente são fotos da planilha
  aberta num tablet (`planilha-atual.md:5`). O tablet é o dispositivo real de uso
  do formulário de avaliação — desenhar para ele primeiro, expandir para desktop,
  garantir 360 px.
- **Tipagem estrita.** `strict` já ligado. Sem `any`, sem `as` para calar o
  compilador, sem `@ts-ignore`. `unknown` + estreitamento onde a fronteira HTTP
  exigir.
- **Código simples.** Preferir o óbvio ao esperto. Comentário explica **por quê**,
  nunca **o quê** — acompanhando o estilo do backend.
- **Evitar abstrações prematuras.** As proibições de 2.7 valem até haver dor
  concreta. Quando houver, documentar a dor aqui junto com a decisão.
- **Idioma.** Identificadores em português sem acento; interface em português com
  acento; vocabulário do professor (siglas da planilha) na tela, sempre.

---

## 11. Riscos conhecidos

### R1 — Formulário de avaliação · probabilidade **alta**

*Causa.* Array dinâmico, decimais pt-BR, distinção vazio/zero, mapeamento de 422
aninhado e prevenção de duplicata, tudo num artefato só.
*Consequência.* O fluxo central fica inutilizável ou corrompe dado.
*Mitigação.* Não-controlado + `FormData` (6.2); Zod compartilhado (6.3); rascunho
local (6.5); `ordem` explícita dispensando reordenação; roteiro manual cobrindo
vírgula, vazio, duplicata e 422.

### R2 — Volatilidade do relatório · probabilidade **alta**

*Causa.* Curva, score e textos são declaradamente provisórios
(`src/lib/calculos.ts:1-10`) e podem mudar de **formato**, não só de valor.
`planilha-atual.md:112-121` levanta a hipótese Samozino, que exige **massa
corporal e distância de push-off** — campos que **não existem** em
`prisma/schema.prisma`.
*Consequência.* Retrabalho no relatório e possivelmente no formulário da E5.
*Mitigação.* Componentes de seção agnósticos ao valor (2.5); nenhuma derivação de
número em componente; eixos sem escala fixa; aviso de provisoriedade vindo da
resposta.

### R3 — Contrato de saída não tipado · probabilidade **média**

*Causa.* O backend exporta tipos de entrada, não de saída.
*Consequência.* Backend muda a resposta, `typecheck` passa, tela quebra em runtime.
*Mitigação.* Derivação por `ReturnType` (7.1); um `tipos.ts` por feature (7.5);
pedido de `RelatorioResponse` (D7); regra de lint contra import server-only (7.4).

### R4 — URL base do `fetch` em Server Component · probabilidade **média**

*Causa.* `fetch` no servidor exige URL absoluta; prerender em build tentaria
acessar um servidor fora do ar.
*Consequência.* `build` quebra, ou funciona em dev e falha em produção.
*Mitigação.* Origem via `headers()` (5.1); ponto único em `api.ts`; `npm run build`
no ciclo desde a E0.

### R5 — Fuso horário e decimal pt-BR · probabilidade **alta se não tratada na E0**

*Causa.* `new Date("2026-07-30")` é meia-noite **UTC** → exibe 29/07 em São Paulo.
`<input type="number">` engasga com vírgula.
*Consequência.* Classe de bugs silenciosos: data errada em relatório assinado,
medida perdida na digitação.
*Mitigação.* Helpers únicos em `formato.ts`; proibição de `new Date()` sobre
string ISO curta fora deles; verificação com datas de virada de mês e valores
decimais.

### R6 — Divergências entre `api.md` e a implementação · probabilidade **certa**

Já mapeadas; o front convive com elas até serem resolvidas:

| Divergência | Onde | Postura do front |
| --- | --- | --- |
| Doc sugere formulário de edição de avaliação; não há endpoint | `api.md:99-102` × `api/avaliacoes/[id]/route.ts` | Não oferecer edição (B5) |
| Unicidade de `codigo`/`ordem` documentada como validação; é constraint de banco → 409 sem campo | `api.md:137` × `schemas.ts:57-71` | Prevenir no cliente (6.6) |
| `periodo.totalAvaliacoes` conta só avaliações com CMJ | `api.md:147` × `relatorio/route.ts:71,111` | Não rotular como "total de avaliações" |
| `cargaMaximaKg` pode vir `null`, não documentado | `relatorio/route.ts:78` | Tratar como anulável |
| `repeticoes.max(100)` não documentado | `schemas.ts:53` | Refletir no `max` do input |
| `periodo`/`resumoCmj` vêm do histórico inteiro, não da avaliação relatada | `relatorio/route.ts:68-72,83` | Rotular com precisão; D2 |

### R7 — Gráficos do Recharts na impressão · probabilidade **média**

*Causa.* Introduzido pela decisão de 8.1. `ResponsiveContainer` e o modo
`responsive` dimensionam pelo viewport, não pela página impressa; e a animação de
montagem pode ser capturada pela metade.
*Consequência.* Gráfico cortado, deformado ou incompleto **no PDF que o professor
vai receber** — falha justamente no artefato que é o produto.
*Mitigação.* Dimensões fixas e animação desligada na instância do relatório (8.2);
conferência obrigatória na pré-visualização de impressão na E3; SVG manual
permanece como plano B documentado (8.6).

### R8 — Peso do Recharts no cliente · probabilidade **baixa**, impacto **baixo**

*Causa.* Recharts 3 traz `@reduxjs/toolkit`, `react-redux`, `immer` e
`victory-vendor`.
*Consequência.* Carregamento mais lento das telas com gráfico.
*Mitigação.* Custo aceito conscientemente (8.1) para ~50 usuários em uso interno.
Medir na E3 e registrar. Só reagir se o número medido surpreender.

*Menção honrosa (baixa probabilidade, detecção rápida):* import acidental de
módulo server-only — mitigado por 7.4.

---

## 12. Decisões pendentes do backend

### Bloqueios

**B1 — Período de 8 semanas.** `GET /avaliacoes/:id/relatorio` não aceita
parâmetro algum; `periodo`, `resumoCmj` e `score` são calculados sobre o histórico
inteiro. Opções: (a) backend adiciona `?semanas=` ou `?de=&ate=`; (b) o front
aplica a janela **apenas** ao gráfico de CMJ e rotula o resto como período
completo. **Bloqueia E7.**

**B2 — Seções do relatório no MVP.** A API não entrega evolução da curva entre
períodos, comparação em pontos-chave nem Pmáx — três das dez seções do relatório
real (`planilha-atual.md:74-93`). Impacta E2/E3 e, pela hipótese Samozino,
possivelmente a E5.

**B3 — O que significa compartilhar.** Não existe PDF, link público,
autenticação nem texto real. Opções: texto resumido montado pelo front, PDF pela
impressão do browser, ou link público sem proteção (expõe dado de atleta).
**Bloqueia E7.**

**B4 — Filiais entram no MVP?** Não existem em `prisma/schema.prisma` nem em
nenhuma rota. Se entram, mudam lista, filtro, cadastro e cabeçalho do relatório.

**B5 — O MVP edita avaliação?** Só há `GET` e `DELETE` em
`src/app/api/avaliacoes/[id]/route.ts`. Se não houver edição, confirmar que
"excluir e recriar" é aceitável — muda a interface da E6.

### Dúvidas não bloqueantes

| # | Pergunta |
| --- | --- |
| D1 | `periodo`/`resumoCmj` deveriam ser recortados até a data da avaliação relatada? |
| D2 | `periodo.totalAvaliacoes` contar só avaliações com CMJ é intencional? |
| D3 | `PATCH /alunos/:id` não consegue **limpar** `dataNascimento` (schema é `.optional()`, não `.nullable()`) — intencional? |
| D4 | `perfil`, `nivel` e mensagens de erro virão acentuados, ou o front assume a tradução? |
| D5 | `POST`/`PATCH /alunos` podem devolver `totalAvaliacoes`, evitando um refetch? |
| D6 | O front pode importar `MEDIDAS` de `@/lib/medidas`, ou o catálogo deve vir só de `GET /medidas`? |
| D7 | Dá para exportar um tipo `RelatorioResponse`? |
| D8 | Extrair um service layer em `src/lib/` está no radar? (viabiliza consumo direto do domínio — 2.3) |

### Dependências externas (cliente)

Dúvidas de `planilha-atual.md` que afetam o front: **nº 3** (fórmulas reais →
liga-se a R2), **nº 5** (textos escritos ou gerados — se escritos, exige campos e
persistência inexistentes), **nº 6** (escopo: só a curva ou a bateria toda),
**nº 9** (PDF ou tela), **nº 10** (migrar histórico), **nº 12** (o que é `SLB` —
hoje a tela mostra a sigla crua).

---

## 13. Checklist de Pull Request

Nenhuma etapa é considerada concluída sem todos os itens verificados.

### Automático

- [ ] `npm run typecheck` sem erro
- [ ] `npm run lint` sem erro nem aviso novo
- [ ] `npm run build` conclui (valida fronteiras RSC/Client e imports server-only)

### Fronteiras

- [ ] Nenhum arquivo em `prisma/`, `src/app/api/` ou `src/lib/` foi alterado
- [ ] Nenhum import de `@/lib/prisma`, `@/lib/http` ou `@/generated/*`
- [ ] Imports de `@/lib/*` em arquivos `"use client"` conferidos um a um
- [ ] Nenhuma regra de negócio reimplementada no front

### Contratos da API

- [ ] Campos consumidos existem na resposta real (conferido com `curl`, não pela doc)
- [ ] Campos anuláveis tratados: `ajuste`, `resumoCmj`, `cargaMaximaKg`,
      `dataNascimento`, `observacoes`, e todos os valores de medida
- [ ] `DELETE` (204) não tem o corpo lido
- [ ] Status 400/404/409/422/500 têm tratamento visível
- [ ] `issues[].field` mapeia para os campos certos do formulário

### Estados

- [ ] **Loading** — esqueleto com a forma do conteúdo, sem layout shift
- [ ] **Erro** — mensagem em português acentuado, com ação de recuperação
- [ ] **Vazio** — distinguindo "ainda não há dado" de "a busca não achou nada"
- [ ] **Sucesso** — feedback claro e dado atualizado na tela (refresh conferido)
- [ ] **Parcial** — medida ausente como "—", nunca "0"

### Acessibilidade

- [ ] Todo campo com `<label>` associado
- [ ] Navegação completa por teclado, foco visível, ordem lógica
- [ ] Erros anunciados (`aria-live`) e foco no primeiro campo inválido
- [ ] Tabelas com `caption` e `scope`; gráficos com alternativa textual
- [ ] Contraste conferido em claro e escuro

### Responsividade

- [ ] Verificado em 360 px, tablet e desktop
- [ ] Sem scroll horizontal na página; conteúdo largo rola no próprio contêiner
- [ ] Alvos de toque adequados no formulário de avaliação

### Teste manual

- [ ] Fluxo da etapa percorrido de ponta a ponta com o seed
- [ ] Decimal com vírgula **e** com ponto (telas com campo numérico)
- [ ] Datas conferidas contra o valor enviado (sem deslocamento de fuso)
- [ ] **Impressão conferida na pré-visualização** (telas do relatório): gráficos
      completos, sem corte, sem animação capturada pela metade, quebras de seção
      corretas em A4

> O teste manual de formulários grava no `prisma/dev.db` local. `npm run db:seed`
> **apaga todos os alunos** antes de recriar (`prisma/seed.ts:38`) — usar consciente.

### Documentação

- [ ] Divergência nova entre `api.md` e implementação registrada na seção 11 (R6)
- [ ] Decisão arquitetural nova registrada aqui, com justificativa
- [ ] Dúvida nova para o backend registrada na seção 12

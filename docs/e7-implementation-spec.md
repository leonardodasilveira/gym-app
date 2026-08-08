# E7 — Período e compartilhamento · especificação de implementação

> **Status:** aprovada, pronta para execução. Escrita em 08/08/2026 sobre o
> código real da branch `main` (E5 v2 e E6 concluídas e mergeadas — PR #20 e
> PR #21).
>
> **Autossuficiente por desenho.** Um agente sem o contexto da conversa que
> originou esta spec deve conseguir executar a E7 inteira lendo só este arquivo
> mais os arquivos que ele cita. Toda afirmação sobre o estado atual aponta para
> arquivo, linha ou saída de comando real.

---

## 1. Status inicial confirmado

| Fato | Evidência |
|---|---|
| Branch `main`, working tree limpo | `git status --short` vazio |
| E6 mergeada | `eaf0558` (PR #21); `2aa616d`…`fac3ccf` são ancestrais |
| Relatório existe e funciona | `src/app/avaliacoes/[id]/relatorio/page.tsx` |
| **A página do relatório NÃO lê `searchParams` hoje** | `page.tsx:39-57`: assinatura recebe só `params`; `carregarRelatorio(id)` não tem parâmetro de período |
| `carregarRelatorio` sem `semanas` | `features/relatorio/dados.ts:13-21` — monta a URL sem query |
| Impressão da E3 existe | `AcaoImprimir.tsx` (`window.print()`) + `@media print` em `globals.css:42-70` |
| **Não existe componente `Select`** | `src/components/ui/`: badge, button, campo-formulario, card, chart, confirm-dialog, empty-state, error-state, input, skeleton, table, valor-ausente |
| Nenhum código de compartilhamento | grep `wa.me`/`mailto`: zero ocorrências em `src/` |
| Textos do relatório são **lorem ipsum** | `src/lib/textos.ts:1-13` — `textosPlaceholder()` |
| Gates verdes no ponto de partida | 107 testes, typecheck ok, lint limpo, build ok |

## 2. Objetivo

Fechar os fluxos 4 e 5 do `frontend-plan.md`: permitir que o professor **escolha
a janela de período** do relatório (padrão 8 semanas, refletida na URL) e
**compartilhe** o resultado por WhatsApp ou e-mail, com o conteúdo montado no
próprio frontend e enviado **somente** por ação explícita dele.

## 3. Não objetivos

- **Nova implementação de impressão/PDF.** A E3 já entregou; a E7 reusa
  `AcaoImprimir` como está. Proibido: `@react-pdf/renderer`, Route Handler de
  PDF, segunda árvore de relatório (`frontend-plan.md` §8.4).
- **Qualquer backend novo** para compartilhamento: sem upload, sem link público,
  sem encurtador, sem tracking, sem persistência do que foi compartilhado.
- **Edição de avaliação / `PATCH` UI** — segue fora de escopo desde a E6.
- **Correção do débito D1** do relatório (§31) — registrar, não corrigir.
- **Redesign global / polish da E8.**
- Instalação de qualquer dependência.

## 4. Fontes de verdade

| Assunto | Autoridade |
|---|---|
| Contrato da API | `docs/api.md` (§310-345, janela de período) |
| Comportamento real | o código do route handler + verificação empírica (§6.2) |
| Arquitetura e roadmap | `docs/frontend-plan.md` (E7 em §9; §8.3-8.5 sobre impressão e isolamento do compartilhamento) |
| Specs concluídas | `e5-v2-` e `e6-implementation-spec.md` — registro histórico/arquitetural |
| Modelo v2 | `evaluation-model-v2-proposal.md` — histórico; `api.md` vence |

**Não ressuscitar o v1.** Curva força-velocidade, R², perfil e score **saíram do
produto** (`534f3d8`). Nenhum texto novo pode mencioná-los.

## 5. Estado atual do relatório (investigado, não presumido)

### 5.1 Arquitetura

```
app/avaliacoes/[id]/relatorio/page.tsx     Server — generateMetadata + página
  ├── AcaoImprimir                          Client (único) — window.print()
  ├── RelatorioCabecalho                    Server
  ├── AvisoProvisorio                       Server
  └── RelatorioSecao × 8                    Server
       ResumoCmj · MedidasTabela · VelocidadeTabela ·
       HistoricoCmjTabela · ListaTextos × 2 · Recomendacoes · conclusão
```

`carregarRelatorio` usa `cache()` para deduplicar entre `generateMetadata` e a
página (`dados.ts:13`). A página trata `404 → notFound()` e **qualquer outro
erro → `throw new Error`** (`page.tsx:52-57`). Isso importa em §11.

### 5.2 O que depende do período e o que não depende

Verificado contra `src/lib/relatorio.ts` e confirmado por chamada real (§6.2):

| Seção da tela | Componente | Recortada pela janela? |
|---|---|---|
| Cabeçalho (linha de período) | `RelatorioCabecalho` | **sim** (`periodo`) |
| Resumo executivo | `ResumoCmj` | **sim** (`resumoCmj`) |
| Histórico de CMJ | `HistoricoCmjTabela` | **sim** (`historicoCmj`) |
| Medidas da avaliação | `MedidasTabela` | **não** — sai da avaliação relatada |
| Velocidade | `VelocidadeTabela` | **não** — sai da avaliação relatada |
| Melhorias / Pontos de atenção / Recomendações / Conclusão | `ListaTextos`, `Recomendacoes` | **não** — placeholders |

### 5.3 Texto legado que a E7 precisa corrigir

`RelatorioCabecalho.tsx:30-34` imprime hoje:

> "Histórico do aluno: {de} até o último registro do histórico ({ate}) ·
> {totalAvaliacoes} avaliações com CMJ no período"

Esse copy foi escrito quando **não existia janela**: ele afirma "último registro
do histórico", o que passa a ser **falso** assim que `?semanas=` recorta. A E7
deve reescrevê-lo (§7). Não é débito pré-existente a registrar — é parte do
escopo, porque a E7 é quem introduz a condição que o torna incorreto.

Também confirmado: **nenhum componente do relatório menciona curva/score** — o
`AvisoProvisorio` passou a ler as chaves de `provisorio` da resposta
(`AvisoProvisorio.tsx:25`), que hoje traz só `textos`.

## 6. Contrato de período

### 6.1 Documentado (`api.md:314-333`)

- `semanas` é inteiro **1 a 520**; fora disso **422**.
- **Sem default de propósito.** Ausente = histórico inteiro.
- Recorta `historicoCmj`, `resumoCmj` e `periodo`. **Não** recorta `velocidade`.
- `periodo.semanas` = janela aplicada, ou `null` no histórico inteiro.
- `periodo.de`/`ate` são os **extremos do dado que existe**, não as bordas da
  janela pedida.

### 6.2 Verificado empiricamente em 08/08/2026

Contra o servidor real, avaliação `b6fb40ac…` (Ana Prado, 8 avaliações):

| Chamada | `periodo` | `historicoCmj` |
|---|---|---|
| sem parâmetro | `{de:"2025-07-10", ate:"2026-04-30", totalAvaliacoes:8, semanas:null}` | 8 pontos |
| `?semanas=8` | `{de:"2026-03-19", ate:"2026-04-30", totalAvaliacoes:2, semanas:8}` | 2 pontos |
| `?semanas=1` | `{de:"2026-04-30", ate:"2026-04-30", totalAvaliacoes:1, semanas:1}` | 1 ponto, `resumoCmj` **presente** |
| `?semanas=0` | **HTTP 422** — `"semanas precisa ser pelo menos 1"` | — |
| `?semanas=abc` | **HTTP 422** — `"expected number, received NaN"` | — |
| `?semanas=999` | **HTTP 422** — `"semanas nao pode passar de 520 (10 anos)"` | — |

Chaves de topo da resposta (12): `aluno, avaliacao, periodo, amplitude, saltos,
medidasDetalhadas, velocidade, velocidadeDetalhada, historicoCmj, resumoCmj,
textos, provisorio`.

Confirmado com `?semanas=1` que `medidasDetalhadas` continua com 9 entradas e
`velocidadeDetalhada` com os 2 exercícios — a janela não os toca.

### 6.3 Consequência crítica de projeto

Hoje `/avaliacoes/:id/relatorio?semanas=999` devolve **HTTP 200** — porque a
página **ignora** `searchParams` por completo. Assim que a E7 ligar o parâmetro,
repassá-lo cru produziria 422 → `throw new Error` → `error.tsx`, ou seja: **uma
URL digitada errada quebraria a tela.**

Por isso a E7 **normaliza antes de chamar a API** (§10-11). O frontend nunca
envia um `semanas` que o backend possa recusar.

## 7. Semântica exata da janela (copy obrigatório)

A tela precisa dizer, sem ambiguidade, três coisas. Copy recomendado para
substituir `RelatorioCabecalho.tsx:30-34`:

**Com janela aplicada** (`periodo.semanas !== null`):

> Janela de **{semanas} semanas** terminando em {formatarData(avaliacao.dataAvaliacao)}.
> Dados no período: {formatarData(periodo.de)} a {formatarData(periodo.ate)} ·
> {periodo.totalAvaliacoes} avaliações com CMJ.

**Sem janela** (`periodo.semanas === null`):

> Histórico completo do aluno: {formatarData(periodo.de)} a
> {formatarData(periodo.ate)} · {periodo.totalAvaliacoes} avaliações com CMJ.

Mais uma nota fixa, junto do seletor:

> A janela afeta o resumo executivo e o histórico de CMJ. Medidas e velocidade
> são sempre as da avaliação de referência.

E, quando `periodo.totalAvaliacoes === 0` ou `resumoCmj === null`:

> Nenhuma avaliação com CMJ nesta janela. Isso não é um erro — amplie o período
> para ver a evolução.

**Regras de redação.** Nunca escrever "último registro do histórico" com janela
ativa (§5.3). Nunca chamar `periodo.de`/`ate` de "início/fim da janela": são os
extremos do dado existente. Nunca mencionar curva, R², perfil ou score.

## 8. URL como fonte de verdade

O período vive **exclusivamente** em `?semanas=` na URL. Não há `useState`
espelhando-o.

```
/avaliacoes/[id]/relatorio            → janela padrão de 8 semanas (§9)
/avaliacoes/[id]/relatorio?semanas=8  → idem, explícito
/avaliacoes/[id]/relatorio?semanas=0  → normalizado para o padrão (§11)
```

Consequências desejadas, todas de graça: refresh mantém a visão, Back/Forward
funcionam, copiar a URL reproduz a mesma tela.

> ⚠️ **O padrão de `BuscaEFiltroAlunos.tsx:23-35` NÃO se aplica aqui.** Aquele
> componente usa `window.history.replaceState` **sem navegar**, e funciona porque
> o filtro de alunos é 100% client-side (a lista inteira já está em memória).
> O período é recortado **pelo servidor**: trocar a janela exige nova requisição.
> Usar `replaceState` aqui mudaria a URL sem atualizar o relatório — bug
> silencioso. A E7 precisa de navegação de verdade.

## 9. Valor padrão

**8 semanas**, conforme `frontend-plan.md` E7 ("padrão 8 semanas").

Isso é uma decisão de **frontend**, e não contradiz o backend: `api.md` diz que a
API não tem default *de propósito*, para não mudar em silêncio o número de
relatórios já existentes. O default da E7 é da tela, aplicado explicitamente na
requisição — a API continua sem default.

Constante única: `SEMANAS_PADRAO = 8` em `features/relatorio/periodo.ts`.

`?semanas=8` e a ausência do parâmetro produzem **a mesma visão**. A ausência é a
URL canônica; o seletor não precisa reescrever a URL só para explicitar o padrão.

## 10. Opções oferecidas

Conjunto fixo, pensado para o uso real (avaliações a cada ~6 semanas, seed com
histórico de ~1 ano):

| Rótulo | `semanas` | Href |
|---|---|---|
| 8 semanas | 8 | `?semanas=8` (ou sem parâmetro) |
| 12 semanas | 12 | `?semanas=12` |
| 26 semanas | 26 | `?semanas=26` |
| 52 semanas | 52 | `?semanas=52` |
| Todo o histórico | — | `?semanas=todo` |

**`semanas=todo`** é um valor **do frontend**, traduzido para "não enviar o
parâmetro" na chamada à API. É o que permite a URL expressar "histórico inteiro"
de forma explícita e compartilhável — a ausência do parâmetro já significa
"padrão 8 semanas" nesta tela, então precisa existir um token distinto.

`OPCOES_PERIODO` é exportado de `features/relatorio/periodo.ts` e é a única
fonte dessas opções.

## 11. Validação dos `searchParams` e parâmetro inválido

Função pura, em `features/relatorio/periodo.ts`:

```ts
export type Periodo = { semanas: number | null; valorUrl: string };

/**
 * Le `?semanas=` e devolve o periodo efetivo. NUNCA lanca, NUNCA devolve um
 * valor que o backend possa recusar com 422 — qualquer entrada fora do
 * conjunto conhecido cai no padrao, porque uma URL digitada errada nao pode
 * quebrar o relatorio (e7-implementation-spec.md §6.3).
 *
 * `semanas: null` = nao enviar o parametro (historico inteiro).
 */
export function periodoDosParametros(bruto: string | string[] | undefined): Periodo;
```

Tabela de comportamento (fechada, sem "outros casos"):

| `?semanas=` | Resultado | Observação |
|---|---|---|
| ausente | `{semanas: 8, valorUrl: "8"}` | padrão |
| `"8"`, `"12"`, `"26"`, `"52"` | `{semanas: N, valorUrl: "N"}` | opção conhecida |
| `"todo"` | `{semanas: null, valorUrl: "todo"}` | histórico inteiro |
| `"0"`, `"999"`, `"abc"`, `""` | `{semanas: 8, valorUrl: "8"}` | **normalizado, sem erro** |
| `"7"` (válido no backend, fora do conjunto) | `{semanas: 8, valorUrl: "8"}` | ver nota |
| array (`?semanas=8&semanas=12`) | `{semanas: 8, valorUrl: "8"}` | mesma defesa de `alunos/page.tsx:22` |

**Nota sobre valores válidos fora do conjunto.** Normalizar `"7"` para o padrão é
deliberado: o seletor oferece um conjunto fechado, e aceitar valores arbitrários
criaria um estado que a UI não consegue representar (nenhuma opção marcada como
ativa). Se no futuro o produto quiser janela livre, isto vira um campo numérico
e a função muda em um lugar só. **Está documentado aqui porque é uma restrição
mais estreita que a do backend**, não um bug.

A página **nunca** repassa `searchParams.semanas` cru para a API.

## 12. Arquitetura Server/Client

Descoberta central da investigação: **a E7 não precisa de nenhum Client
Component novo.**

- **Seletor de período**: um grupo de `<Link>` com `href` absoluto para a mesma
  rota com outra query. `<Link>` navega de verdade (dispara o Server Component),
  suporta Back/Forward, é focável e operável por teclado nativamente, e funciona
  sem JavaScript. Um `<select>` + `router.push` exigiria Client Component e
  entregaria menos.
- **Compartilhamento**: `wa.me` e `mailto:` são **URLs**. Com a mensagem montada
  no servidor (dados já disponíveis) e a origem absoluta vinda de `origemAtual()`
  (`features/shared/origem.ts:9`, já usada pelo loader), os dois viram `<a href>`
  comuns. Não há estado, não há `onClick`.
- **Impressão**: `AcaoImprimir` continua sendo o único Client Component do
  relatório, exatamente como hoje. Não é tocado.

Árvore final:

```
RelatorioPage                       Server
  ├── PeriodoRelatorio              Server — Links
  ├── AcoesRelatorio                Server — agrupa:
  │     ├── AcaoImprimir            Client (existente, intocado)
  │     ├── <a> WhatsApp            Server
  │     └── <a> E-mail              Server
  └── (seções existentes)           Server
```

**Justificativa de tê-lo assim e não com `useState`:** o período já é
representado pela URL (§8) e a mensagem é função pura dos dados + período.
Introduzir estado de cliente duplicaria informação que a URL já carrega — o que
o próprio pedido da etapa proíbe.

## 13. Seletor de período — UI

Reusa o padrão visual do filtro de status de `BuscaEFiltroAlunos.tsx:73-89`
(grupo de botões), mas com `<Link>` em vez de `<button>`:

```tsx
<nav aria-label="Janela de período do relatório" className="flex flex-wrap gap-2">
  {OPCOES_PERIODO.map((opcao) => (
    <Link
      key={opcao.valorUrl}
      href={hrefComPeriodo(baseHref, opcao.valorUrl)}
      aria-current={opcao.valorUrl === periodo.valorUrl ? "page" : undefined}
      className={cn(
        buttonVariants({
          variant: opcao.valorUrl === periodo.valorUrl ? "default" : "outline",
          size: "sm",
        }),
        "h-11 sm:h-9",
      )}
    >
      {opcao.rotulo}
    </Link>
  ))}
</nav>
```

- Estado ativo por **`aria-current="page"` + variante visual** — nunca só cor
  (requisito de acessibilidade da etapa).
- `h-11 sm:h-9`: alvo de toque, convenção do projeto.
- `flex-wrap`: em 360px as 5 opções quebram em linhas, sem overflow.
- Marcado com `nao-imprimir` no contêiner de ações (§15).

## 14. Composição das ações

Uma única barra, no topo, dentro do `div.nao-imprimir` que já existe
(`page.tsx:63`):

```
← Ficha do aluno                    [Imprimir / Salvar PDF] [WhatsApp] [E-mail]

Janela: [8 semanas] [12] [26] [52] [Todo o histórico]
A janela afeta o resumo executivo e o histórico de CMJ. Medidas e velocidade
são sempre as da avaliação de referência.
```

Imprimir mantém `variant="outline" size="sm"` (como está); WhatsApp e E-mail
usam a mesma variante para não sugerir hierarquia entre elas. Nada disso aparece
no papel — `.nao-imprimir` já resolve (`globals.css:49-51`).

## 15. Impressão existente

`AcaoImprimir.tsx` **não é modificado**. A E7 apenas o posiciona no novo grupo de
ações. O `@media print` de `globals.css:42-70` já esconde `.nao-imprimir`,
força fundo branco e aplica `@page A4 portrait` — **o seletor de período e os
links de compartilhamento somem do PDF automaticamente**, sem CSS novo.

Consequência desejada: imprimir depois de trocar o período gera o PDF **da
janela escolhida**, porque o conteúdo é renderizado no servidor com aquele
recorte. Item obrigatório de QA (§27).

## 16-17. WhatsApp e e-mail

**WhatsApp** — `https://wa.me/?text=<mensagem>`

Sem número de destino: `wa.me/?text=` abre o WhatsApp e deixa o professor
escolher o contato. Não temos telefone de aluno no domínio (`prisma/schema.prisma`
não tem o campo) e não é papel da E7 introduzi-lo.

**E-mail** — `mailto:?subject=<assunto>&body=<corpo>`

Sem destinatário, pela mesma razão.

Ambos:
- `target="_blank"` + `rel="noopener noreferrer"` no WhatsApp (abre serviço
  externo); `mailto:` **sem** `target="_blank"` (abrir aba em branco para um
  handler de protocolo deixa uma aba órfã em vários navegadores).
- Texto acessível explícito: `Compartilhar por WhatsApp` /
  `Compartilhar por e-mail` — nunca só o ícone.

## 18. Resumo compartilhável — conteúdo

Curto por desenho: o objetivo é abrir uma conversa, não transportar o relatório.

**Proibido no resumo:** os textos de `relatorio.textos` — são **lorem ipsum**
(`src/lib/textos.ts:1-13`), e enviá-los a uma pessoa real seria absurdo.
Também proibido: qualquer interpretação clínica, score, diagnóstico ou conclusão
de desempenho que o dado atual não sustenta.

**Formato exato** (mensagem do WhatsApp e corpo do e-mail são o mesmo texto):

```
Relatório de performance — Ana Prado
Avaliação de referência: 30/04/2026
Janela: 8 semanas (2 avaliações com CMJ)

CMJ mais recente do histórico: 43,53 cm
Variação vs. inicial: -1,48 cm
Variação vs. pico: -2,42 cm

Relatório completo: http://localhost:3000/avaliacoes/b6fb40ac.../relatorio?semanas=8
```

Regras de montagem:

- Linha "Janela" usa "Histórico completo" quando `periodo.semanas === null`.
- O bloco de CMJ **é omitido inteiro** quando `resumoCmj === null`, e no lugar
  entra uma única linha: `Sem CMJ registrado nesta janela.`
- Rótulo obrigatório **"CMJ mais recente do histórico"**, nunca "atual" — é a
  mesma regra que `ResumoCmj.tsx:19-22` já documenta: esse valor é o mais
  recente do histórico recortado, que pode divergir da avaliação relatada.
- Números por `formatarNumeroOuTraco`/`formatarDeltaOuTraco` (pt-BR, sinal
  explícito na variação) — nunca `toString()` cru.
- O link carrega o `?semanas=` da visão atual, para reproduzir exatamente o que
  o professor está vendo.

**Assunto do e-mail** (linha única):

```
Relatório de performance — Ana Prado — 30/04/2026
```

## 19. Função pura de montagem

Em `features/relatorio/compartilhamento.ts` — isolada da UI, como
`frontend-plan.md` §8.5 item 3 exige ("a montagem do conteúdo de
compartilhamento fica isolada em `features/relatorio/`, não espalhada na
página").

```ts
export type ConteudoCompartilhamento = {
  assunto: string;
  mensagem: string;
};

/** Monta assunto e mensagem. Pura: nada de window, fetch ou Date.now(). */
export function montarCompartilhamento(
  relatorio: RelatorioResponse,
  urlDaVisao: string,
): ConteudoCompartilhamento;

/** `https://wa.me/?text=...` */
export function urlWhatsApp(conteudo: ConteudoCompartilhamento): string;

/** `mailto:?subject=...&body=...` */
export function urlEmail(conteudo: ConteudoCompartilhamento): string;
```

Nenhuma concatenação de string de mensagem fora deste módulo.

## 20. Encoding

- **Sempre `encodeURIComponent`** em `text`, `subject` e `body`. Nunca
  `encodeURI`, que não escapa `&` nem `#` — um nome de aluno com `&` truncaria a
  mensagem.
- Quebra de linha: `\n` literal na string, codificado como `%0A` pelo
  `encodeURIComponent`. Não usar `%0D%0A` manualmente.
- Acentos: `encodeURIComponent` produz UTF-8 percent-encoded; "Relatório" vira
  `Relat%C3%B3rio`. Correto para os dois destinos.
- Montar com `URLSearchParams` no `mailto:` **não** serve: ele codifica espaço
  como `+`, que clientes de e-mail exibem literalmente no corpo. Concatenar
  manualmente com `encodeURIComponent`.
- **Limite de tamanho:** a mensagem especificada tem ~250 caracteres. `mailto:`
  em navegadores antigos degrada acima de ~2000; o formato fixo do §18 fica
  uma ordem de grandeza abaixo, então não há truncamento a implementar. Se um
  campo futuro puder crescer sem limite (ex.: observações), ele **não entra** no
  resumo — foi por isso que ficou de fora.

## 21. Privacidade

Regras que a implementação precisa respeitar literalmente:

- Nada sai da aplicação sem **clique explícito** do professor. Os links não são
  disparados por `useEffect`, `onLoad`, prefetch de ação ou navegação
  programática.
- **Nenhuma API de WhatsApp/e-mail é chamada.** O navegador apenas abre o
  destino; a aplicação não fala com serviço externo.
- Sem upload, sem link público, sem rota sem proteção, sem PDF anexado
  automaticamente, sem encurtador.
- **Sem tracking e sem persistência**: não registrar que houve compartilhamento,
  nem o conteúdo, nem em banco, nem em `localStorage`, nem em log.
- O link incluído aponta para a instalação atual (`origemAtual()`), que em
  produção só é alcançável por quem já tem acesso — a E7 não cria acesso novo.

## 22. Acessibilidade

- Seletor em `<nav aria-label="Janela de período do relatório">`; opção ativa com
  `aria-current="page"` **além** da variante visual.
- Links de compartilhamento com texto visível; se ganharem ícone, o texto
  permanece (não vira `aria-label` sozinho).
- WhatsApp abre em nova aba → `rel="noopener noreferrer"`; considerar sufixo
  "(abre em nova aba)" em `sr-only`.
- Ordem de foco: voltar → imprimir → WhatsApp → e-mail → opções de período →
  conteúdo. Todos alcançáveis por Tab, com foco visível (o `buttonVariants` já
  traz `focus-visible:outline-2`).
- A troca de período é uma **navegação**: o leitor de tela anuncia a página nova
  naturalmente. Não inventar `aria-live` para isso.
- Nada comunicado só por cor.

## 23. Responsividade

- 360 / 768 / 1280. Ações e seletor em `flex-wrap`; nada de rolagem horizontal
  **da página** (`document.body.scrollWidth === window.innerWidth`).
- Alvos `h-11` em telas pequenas, `sm:h-9` acima.
- Em 360px a barra de ações quebra em duas linhas e as 5 opções de período em
  duas ou três — comportamento esperado, não bug.

## 24. Loading e erro

- `loading.tsx` do relatório já existe; acrescentar um `Skeleton` para a barra de
  ações/seletor mantém o esqueleto fiel. Alteração pequena e opcional — se
  alterado, manter a estrutura existente.
- Trocar de período dispara navegação: o `loading.tsx` aparece naturalmente.
- `error.tsx` e `not-found.tsx` ficam como estão. Com a normalização do §11, a
  E7 **não introduz** nenhum caminho novo de erro: um `semanas` inválido nunca
  chega à API.

## 25. Testes automatizados

**Infraestrutura real** (não presumir): `vitest.config.mts` usa
`environment: "node"` e `include: ["src/**/*.test.ts"]`. **Sem jsdom, sem React
Testing Library, sem `.tsx`.** Componentes não são testáveis. **Não instalar
nada** para mudar isso.

Toda a lógica da E7 foi desenhada como função pura justamente por isso.

### 25.1 `features/relatorio/periodo.test.ts`

| # | Caso | Asserção |
|---|---|---|
| 1 | ausente | `{semanas: 8, valorUrl: "8"}` |
| 2 | `"8"`,`"12"`,`"26"`,`"52"` | devolve o próprio valor |
| 3 | `"todo"` | `{semanas: null, valorUrl: "todo"}` |
| 4 | `"0"`, `"999"`, `"abc"`, `""` | normaliza para o padrão, **sem lançar** |
| 5 | `"7"` (válido no backend, fora do conjunto) | normaliza para o padrão |
| 6 | array | usa o primeiro/padrão, sem lançar |
| 7 | `hrefComPeriodo` | `?semanas=12`; preserva o path da avaliação |
| 8 | `hrefComPeriodo` com padrão | forma canônica estável e idempotente |

### 25.2 `features/relatorio/compartilhamento.test.ts`

| # | Caso | Asserção |
|---|---|---|
| 9 | mensagem com janela | contém nome, data de referência, "8 semanas" e o link com `?semanas=8` |
| 10 | mensagem sem janela | diz "Histórico completo", link sem `semanas` ou com `todo` |
| 11 | `resumoCmj === null` | bloco de CMJ ausente; linha "Sem CMJ registrado nesta janela." |
| 12 | **nunca inclui `textos`** | mensagem não contém "Lorem"/"ipsum" |
| 13 | números pt-BR | vírgula decimal; variação com sinal explícito |
| 14 | rótulo do CMJ | contém "mais recente do histórico", não "atual" |
| 15 | `urlWhatsApp` | começa com `https://wa.me/?text=`; acento vira `%C3%B3` |
| 16 | `urlWhatsApp` | `\n` vira `%0A`; espaço vira `%20` (**não** `+`) |
| 17 | `urlEmail` | `mailto:?subject=...&body=...`; assunto e corpo codificados |
| 18 | caractere ambíguo | nome com `&` não trunca a query |

**Não automatizável** (vai para §27): renderização, navegação real, impressão,
abertura dos handlers externos, responsividade, foco.

## 26. QA manual

Pré-requisito: `npm run dev`, dados de seed. **Não resetar o banco.**

**Período**
1. Abrir `/avaliacoes/{id}/relatorio` sem query → janela de **8 semanas**
   aplicada e indicada como ativa.
2. Trocar para 26 semanas → URL vira `?semanas=26`, números do resumo e do
   histórico mudam, opção ativa muda.
3. Refresh → mesma visão.
4. Back → volta ao período anterior; Forward → avança.
5. Copiar a URL e abrir em outra aba → visão idêntica.
6. `?semanas=999`, `?semanas=abc`, `?semanas=0` → **página carrega
   normalmente** no padrão, sem erro (verificação direta do §6.3).
7. `?semanas=todo` → histórico completo, cabeçalho diz "Histórico completo".
8. Janela estreita (`?semanas=1` via troca de opção mais próxima disponível) →
   se não houver CMJ, aparece a mensagem de "não é um erro", não uma tela de erro.
9. Confirmar que **Medidas e Velocidade não mudam** ao trocar o período.

**Compartilhamento**
10. WhatsApp abre com o texto pré-preenchido, acentos corretos, quebras de linha
    preservadas, link clicável.
11. E-mail abre o cliente com assunto e corpo pré-preenchidos.
12. Trocar o período e compartilhar de novo → o link na mensagem carrega o
    **novo** `?semanas=`.
13. Nenhum dos dois dispara sozinho ao carregar a página (observar a aba de rede
    e o fato de nenhum app abrir sem clique).

**Impressão**
14. Trocar o período e imprimir → o PDF mostra a janela escolhida.
15. No preview de impressão, o seletor de período e os botões de compartilhar
    **não aparecem**.

**Transversal**
16. 360 / 768 / 1280 sem overflow horizontal da página.
17. Navegação completa por teclado: alcançar e acionar cada opção de período,
    imprimir, WhatsApp e e-mail; foco visível em todos.

## 27. Arquivos a criar

| Arquivo | Papel |
|---|---|
| `src/features/relatorio/periodo.ts` | `SEMANAS_PADRAO`, `OPCOES_PERIODO`, `periodoDosParametros`, `hrefComPeriodo` — puro |
| `src/features/relatorio/periodo.test.ts` | casos 1-8 |
| `src/features/relatorio/compartilhamento.ts` | `montarCompartilhamento`, `urlWhatsApp`, `urlEmail` — puro |
| `src/features/relatorio/compartilhamento.test.ts` | casos 9-18 |
| `src/features/relatorio/PeriodoRelatorio.tsx` | Server — grupo de `<Link>` + nota do §7 |
| `src/features/relatorio/AcoesRelatorio.tsx` | Server — agrupa imprimir + WhatsApp + e-mail |

## 28. Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/app/avaliacoes/[id]/relatorio/page.tsx` | aceitar `searchParams`; normalizar período; passar `semanas` ao loader; renderizar `PeriodoRelatorio` e `AcoesRelatorio` |
| `src/features/relatorio/dados.ts` | `carregarRelatorio(id, semanas)` — acrescenta `?semanas=` quando não-nulo; manter `cache()` |
| `src/features/relatorio/RelatorioCabecalho.tsx` | copy da linha de período conforme §7 |
| `src/app/avaliacoes/[id]/relatorio/loading.tsx` | (opcional) skeleton da barra de ações |
| `docs/frontend-plan.md` | **só na U5**: E7 concluída, B3 resolvido |

## 29. Arquivos protegidos

**Não alterar em nenhuma unidade:**

```
prisma/**                          (schema, migrations, seed)
src/lib/**                         (leitura/import apenas — nunca editar)
src/app/api/**                     (todos os route handlers)
docs/api.md
docs/evaluation-model-v2-proposal.md
docs/e5-v2-implementation-spec.md · docs/e5-v2-execution-prompt.md
docs/e6-implementation-spec.md
src/features/avaliacoes/**         (formulário E5 e detalhe E6)
src/app/alunos/**  ·  src/app/avaliacoes/[id]/page.tsx
src/features/alunos/**
src/components/ui/**               (reusar, não modificar)
src/app/globals.css                (o print CSS da E3 já resolve — §15)
```

`src/features/relatorio/AcaoImprimir.tsx` é **reposicionado, não modificado**.

**Se a implementação exigir alterar backend, `src/lib/**` ou `docs/api.md`:
PARE e reporte.** Isso é bloqueio, não licença — o contrato de período já está
completo e verificado (§6), então nenhuma necessidade dessas deveria surgir.

## 30. Débitos conhecidos (registrar, não corrigir)

**D1 — `MedidasTabela.tsx:33` imprime cabeçalho fixo `"Valor (cm)"`** para as 9
medidas, incluindo os 4 saltos cujo catálogo diz `unidade: null`. **Confirmado
ainda presente em 08/08/2026.** Herdado da E6 (§25 daquela spec).
**Não bloqueia a E7:** a janela de período não toca `medidasDetalhadas` (§5.2, §6.2),
e o compartilhamento não inclui medidas (§18). Corrigir numa etapa própria.

**D2 — `features/relatorio/rotulos.ts` é código morto.** `corrigirAcentuacao`
existe para acentuar `perfil`/`nivel`, campos que **saíram da resposta** com a
remoção da curva (`534f3d8`); o cabeçalho do arquivo ainda cita
`src/lib/calculos.ts`, apagado. Nenhum componente o importa. Não bloqueia a E7.
Remoção fica para uma limpeza própria.

**D3 — dependência `features/relatorio` → `features/alunos`** não se aplica aqui,
mas o débito equivalente registrado na E6 (§25 D2) segue aberto.

**D4 — `api.md` sem seção dedicada para `GET`/`DELETE /avaliacoes/:id`** (E6, D4).

## 31. Riscos

**R1 — Normalização silenciosa demais.** Um `?semanas=999` cai no padrão sem
avisar; o professor pode não perceber que a janela não foi a pedida. Mitigação
aceita: a opção ativa fica visivelmente marcada, então a janela em vigor é sempre
legível na tela. Alternativa recusada: banner de "parâmetro inválido" — ruído
para um caso que só ocorre com URL editada à mão.

**R2 — `mailto:` sem cliente configurado.** Em máquina sem cliente de e-mail
padrão, o clique não faz nada visível. É comportamento do sistema operacional,
não da aplicação; não há fallback razoável dentro do escopo (copiar para a área
de transferência seria funcionalidade nova). Registrar em QA se ocorrer.

**R3 — Copy do cabeçalho.** `RelatorioCabecalho` é usado só pelo relatório, mas o
texto novo precisa cobrir os dois modos (com e sem janela) — errar aqui produz
afirmação falsa sobre os dados. Mitigação: os dois textos estão fixados
literalmente em §7 e cobertos por QA (itens 1, 2, 7).

**R4 — `origemAtual()` atrás de proxy.** O link compartilhado usa
`x-forwarded-proto` + `host` (`origem.ts:12`). Em deploy com proxy mal
configurado, o link pode sair com host interno. Fora do escopo da E7 (afeta
igualmente o loader que já existe), mas vale conferir no primeiro deploy real.

## 32. Decisões tomadas durante a investigação

1. **B3 resolvido para o MVP/demo** (§33).
2. **Nenhum Client Component novo** — `<Link>` e `<a>` cobrem tudo (§12).
3. **`replaceState` do filtro de alunos não se aplica** — o período exige
   refetch no servidor (§8). Copiar aquele padrão seria bug silencioso.
4. **Normalizar no frontend em vez de repassar cru** — o backend responde 422 a
   `semanas` inválido, e a página `throw`a em não-404 (§6.3, §11).
5. **Conjunto fechado de opções** (8/12/26/52/todo), com `"todo"` como token de
   frontend, porque a ausência do parâmetro já significa "padrão 8" nesta tela
   (§10).
6. **Textos do relatório ficam fora do compartilhamento** — são lorem ipsum
   (§18).
7. **Sem número/destinatário** em `wa.me`/`mailto:` — o domínio não tem telefone
   nem e-mail de aluno (§16-17).
8. **`AcaoImprimir` reusado sem modificação**; o print CSS existente já esconde
   os controles novos (§15).

## 33. B3 — decisão final

`frontend-plan.md:1470-1473` ainda registra **B3 — "O que significa
compartilhar"** como bloqueio da E7. **A investigação não encontrou nenhuma
decisão mais nova** no código ou na documentação que o resolva ou contradiga:
não há `wa.me`, `mailto`, upload, link público ou rota de PDF em lugar nenhum de
`src/`.

**B3 fica RESOLVIDO PARA O MVP/DEMO nos seguintes termos:**

Compartilhar significa **abrir o cliente escolhido pelo professor com o conteúdo
pré-preenchido** — WhatsApp via `wa.me`, e-mail via `mailto:`, resumo montado no
frontend, com o link da visão atual quando útil. **Nunca "enviar
silenciosamente".**

Explicitamente **fora**: transmissão automática, API externa de compartilhamento,
upload, link público novo, rota pública sem proteção, PDF anexado
automaticamente, backend novo. Impressão/PDF continua sendo a da E3, acionada
pelo usuário.

O gatilho de `frontend-plan.md` §8.5 — "se B3 resolver como PDF anexado
automaticamente, vira dependência de backend" — **não foi acionado**: a decisão
mantém o compartilhamento inteiramente no frontend.

Registrar na U5, em `frontend-plan.md`, com esta redação e a data.

## 34. Divergências documentação × código

| # | Divergência | Classificação |
|---|---|---|
| 1 | `frontend-plan.md` E7 (nota de 05/08) diz que a janela "não afeta `curva` nem `score`" | **documentação desatualizada** — curva e score não existem mais (`534f3d8`). O fato substantivo (a janela não recorta o que sai da avaliação relatada) continua válido: hoje aplica-se a `velocidade`, `medidasDetalhadas` e `saltos`. Corrigir na U5, junto do registro de conclusão |
| 2 | `frontend-plan.md` E7 e §12 tratam **B3 como bloqueio aberto** | **resolvido nesta spec** (§33); atualizar na U5 |
| 3 | `RelatorioCabecalho.tsx:31` afirma "último registro do histórico" | **código que a E7 torna incorreto** — parte do escopo (§5.3, §7), não débito |
| 4 | `rotulos.ts` cita `src/lib/calculos.ts`, apagado | **código morto** — débito D2, fora do escopo |
| 5 | `api.md:450` e `501` mencionam `?semanas=` corretamente | **sem divergência** |

Nenhuma divergência bloqueia a E7.

## 35. Unidades de implementação

### U1 — Período na URL, com normalização e loader

**Objetivo.** O relatório passa a respeitar `?semanas=`, com padrão 8 semanas e
sem quebrar em URL inválida.

**Arquivos.** Criar `features/relatorio/periodo.ts` e `periodo.test.ts`. Alterar
`features/relatorio/dados.ts` e `app/avaliacoes/[id]/relatorio/page.tsx`.

**Implementação.** `periodoDosParametros` e `hrefComPeriodo` conforme §11;
`carregarRelatorio(id, semanas)` acrescenta a query só quando `semanas !== null`,
mantendo `cache()`; a página aceita `searchParams` no padrão de
`app/alunos/page.tsx:16-25` e passa o valor **já normalizado**.

**Testes.** Casos 1-8 (§25.1).

**QA.** Itens 1-6 do §26 (com atenção ao 6: URL inválida não quebra).

**Aceite.** Sem query aplica 8 semanas; `?semanas=26` muda os números;
`?semanas=999`/`abc`/`0` carregam no padrão sem erro; gates verdes.

**Commit.** `feat(relatorio): aplica janela de periodo a partir da URL`

---

### U2 — Seletor de período e semântica da janela

**Objetivo.** O professor consegue trocar a janela e entende o que ela afeta.

**Arquivos.** Criar `features/relatorio/PeriodoRelatorio.tsx`. Alterar
`RelatorioCabecalho.tsx` e a página.

**Implementação.** Grupo de `<Link>` conforme §13; copy do cabeçalho conforme
§7, cobrindo os dois modos e o caso sem CMJ.

**Testes.** Nenhum novo (componentes não são testáveis, §25).

**QA.** Itens 2, 7, 8, 9 do §26.

**Aceite.** Opção ativa marcada por `aria-current` **e** variante; cabeçalho
correto com e sem janela; Medidas e Velocidade não mudam ao trocar o período;
nenhuma menção a curva/score; gates verdes.

**Commit.** `feat(relatorio): adiciona seletor de janela de periodo`

---

### U3 — Resumo compartilhável (função pura)

**Objetivo.** A mensagem existe, testada, antes de qualquer UI usá-la.

**Arquivos.** Criar `features/relatorio/compartilhamento.ts` e
`compartilhamento.test.ts`.

**Implementação.** `montarCompartilhamento`, `urlWhatsApp`, `urlEmail` conforme
§18-20. Nenhuma UI nesta unidade.

**Testes.** Casos 9-18 (§25.2) — incluindo o 12, que garante que lorem ipsum
nunca entra na mensagem.

**QA.** Nenhum (sem UI ainda).

**Aceite.** 10 testes passando; encoding correto para acento, espaço e `\n`;
gates verdes.

**Commit.** `feat(relatorio): monta resumo compartilhavel em funcao pura`

---

### U4 — Ações de compartilhamento na tela

**Objetivo.** WhatsApp e e-mail abrem preenchidos, ao lado de imprimir.

**Arquivos.** Criar `features/relatorio/AcoesRelatorio.tsx`. Alterar a página.

**Implementação.** Barra do §14, reusando `AcaoImprimir` **sem modificá-lo**;
`<a>` construídos com as funções da U3; URL da visão montada com `origemAtual()`
+ `hrefComPeriodo`.

**Testes.** Nenhum novo.

**QA.** Itens 10-15 do §26 — incluindo 13 (nada dispara sozinho) e 15 (controles
somem na impressão).

**Aceite.** Os dois abrem preenchidos; link reflete a janela atual; nada sai sem
clique; nada disso aparece no PDF; gates verdes.

**Commit.** `feat(relatorio): compartilha por whatsapp e e-mail`

---

### U5 — QA final e documentação

**Objetivo.** Fechar a etapa e registrar B3.

**Arquivos.** Alterar `docs/frontend-plan.md`. Opcionalmente
`relatorio/loading.tsx` (skeleton da barra).

**Implementação.** Marcar E7 concluída; registrar **B3 resolvido para o
MVP/demo** com a redação do §33; corrigir a nota que ainda fala em "curva"/"score"
(§34, item 1). **Sem apagar histórico útil e sem reescrever seções não
relacionadas.**

**Testes.** Nenhum novo.

**QA.** Passada completa no §26, incluindo 16 e 17 (responsividade e teclado).

**Aceite.** Checklist do §38 inteiro; gates verdes.

**Commits.** `feat(relatorio): ajusta esqueleto de carregamento das acoes` (se
houver) e `docs: registra conclusao da E7 e resolucao do B3`

## 36. Gates

Após **cada** unidade, e todos de novo ao final:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Nenhuma unidade é concluída com gate vermelho. Não commitar com gate vermelho.
Não usar `--no-verify`.

## 37. Commits previstos

| # | Unidade | Mensagem |
|---|---|---|
| 1 | U1 | `feat(relatorio): aplica janela de periodo a partir da URL` |
| 2 | U2 | `feat(relatorio): adiciona seletor de janela de periodo` |
| 3 | U3 | `feat(relatorio): monta resumo compartilhavel em funcao pura` |
| 4 | U4 | `feat(relatorio): compartilha por whatsapp e e-mail` |
| 5 | U5 | `feat(relatorio): ajusta esqueleto de carregamento das acoes` *(opcional)* |
| 6 | U5 | `docs: registra conclusao da E7 e resolucao do B3` |

Commits locais. **Sem push, merge, rebase ou troca de branch**, salvo instrução
explícita posterior. O corpo de cada mensagem explica a decisão não óbvia da
unidade (por que normalizar em vez de repassar; por que `<Link>` em vez de
`select` + `router.push`).

## 38. Checklist final

- [ ] Sem query, o relatório aplica **8 semanas** e indica isso
- [ ] Trocar a janela muda a URL, o resumo e o histórico de CMJ
- [ ] Medidas e Velocidade **não** mudam com a janela
- [ ] `?semanas` inválido (`0`, `999`, `abc`, vazio, repetido) **não quebra** a página
- [ ] `?semanas=todo` mostra o histórico completo e o cabeçalho diz isso
- [ ] Refresh, Back, Forward e copiar-URL reproduzem a mesma visão
- [ ] Janela sem CMJ mostra mensagem explicativa, não erro
- [ ] Cabeçalho não afirma "último registro do histórico" com janela ativa
- [ ] Nenhum texto novo menciona curva, R², perfil ou score
- [ ] WhatsApp e e-mail abrem preenchidos, com acento e quebra de linha corretos
- [ ] O link compartilhado carrega o `?semanas=` da visão atual
- [ ] A mensagem **não** contém lorem ipsum
- [ ] Nada é compartilhado sem clique explícito; nenhuma API externa é chamada
- [ ] Imprimir após trocar o período gera o PDF daquela janela
- [ ] Seletor e ações de compartilhar **não** aparecem no PDF
- [ ] 360 / 768 / 1280 sem overflow horizontal da página
- [ ] Navegação completa por teclado com foco visível
- [ ] `AcaoImprimir.tsx` não foi modificado
- [ ] Nenhum arquivo protegido (§29) foi alterado
- [ ] Débito D1 **não** foi corrigido, apenas registrado
- [ ] B3 registrado como resolvido para o MVP em `frontend-plan.md`
- [ ] Os 5 gates verdes (§36)
- [ ] Commits na ordem do §37, sem push

## 39. Condições de parada

Parar e reportar, sem improvisar, se:

- o contrato real de `?semanas=` divergir do §6 (revalidar com as chamadas
  daquela seção antes de concluir divergência);
- for necessário alterar `src/lib/**`, `src/app/api/**`, `docs/api.md`, Prisma,
  seed ou migrations para cumprir qualquer critério;
- surgir evidência que contradiga a decisão de B3 do §33;
- o comportamento do backend tornar um critério de aceite impossível;
- um gate revelar defeito estrutural fora do escopo da E7;
- o navegador necessário para um critério obrigatório de QA estiver indisponível.

**Não parar por:** decisão já fechada nesta spec, detalhe cosmético, warning
investigável, necessidade normal de criar os arquivos previstos, ou teste
corrigível dentro do escopo da unidade.

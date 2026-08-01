# E3 — Exportação e apresentação do relatório

Especificação operacional da etapa E3. Escrita em **01/08/2026**, a partir de
investigação empírica no navegador (Chrome 150 headless, CDP, PDFs A4 reais
gerados e inspecionados página a página) sobre o relatório entregue pela E2.

Autoridade acima deste documento, nesta ordem:
[`api.md`](api.md) → [`frontend-plan.md`](frontend-plan.md) → esta spec.

Documento anterior da série: [`e2-implementation-spec.md`](e2-implementation-spec.md).

---

## 1. Resumo

### 1.1 Objetivo

Transformar `/avaliacoes/[id]/relatorio` — hoje uma página web correta mas sem
nenhum tratamento de impressão — num artefato **apresentável em papel e
exportável como PDF pelo próprio navegador**, sem duplicar a implementação do
relatório e sem perder nada do que a E2 entregou.

### 1.2 Valor para a demo

O produto é o relatório (`planilha-atual.md`, "A descoberta principal"). Numa
apresentação presencial, o momento decisivo é o professor apertar `Ctrl+P`,
salvar um PDF e mandar por WhatsApp para o atleta. Hoje esse PDF sai **em 4
páginas, com uma tabela partida ao meio, um cabeçalho de tabela órfão no pé da
página 1, o link de navegação impresso, e — para quem usa o sistema em tema
escuro — texto cinza-claro sobre papel branco, ilegível.** A E3 existe para
fechar exatamente essa lacuna.

### 1.3 Escopo

- Ação "Imprimir / Salvar PDF" na página do relatório.
- Bloco `@media print` em `src/app/globals.css`.
- Regra `@page` (A4 retrato, margens).
- Contrato de cor próprio da impressão, independente do tema da tela.
- Controle de quebra de página por seção, tabela e linha.
- Ocultação de navegação e de controles no papel.
- Título de documento por rota (nome do arquivo sugerido ao salvar o PDF).
- Refinamento do rodapé e da data de emissão.
- Validação empírica em PDF A4 real, página a página.

### 1.4 Fora de escopo

Envio real de e-mail · integração com WhatsApp · armazenamento ou upload de PDF ·
geração de PDF no servidor · URL pública do relatório · autenticação · assinatura
digital · **gráficos** · alteração de fórmulas, textos ou de qualquer arquivo do
backend · período editável · `@react-pdf/renderer` ou qualquer dependência nova ·
resolução global dos tokens da Nova · qualquer entregável da E4.

### 1.5 Divergência declarada em relação ao `frontend-plan.md`

`frontend-plan.md` §9 descreve a **E3 como "Gráficos e impressão"**, com
`GraficoCmj` e `GraficoCurva` sobre Recharts. **Esta E3 entrega apenas a parte de
impressão/exportação. Os gráficos foram explicitamente retirados do escopo.**

Consequências que o implementador deve conhecer, mas **não** deve tentar resolver:

- Os critérios de aceite de gráficos de `frontend-plan.md` §9/E3 (animação
  desligada, alternativa textual, custo de bundle do Recharts, risco R7) ficam
  **pendentes**, não cancelados.
- `recharts` continua instalado e **não usado**. Não remover.
- Atualizar `frontend-plan.md` §9 para refletir o novo recorte é trabalho de
  documentação a ser feito **depois**, com decisão explícita — não faz parte
  desta etapa.

---

## 2. Estado atual

### 2.1 Estrutura do relatório da E2

Rota: `src/app/avaliacoes/[id]/relatorio/` — `page.tsx`, `loading.tsx`,
`error.tsx`, `not-found.tsx`.

`page.tsx` é Server Component, faz **uma** chamada a
`GET /api/avaliacoes/:id/relatorio` via `apiFetch` + `origemAtual()`, trata 404
com `notFound()` e demais erros com `throw`. Ordem do DOM (que é a ordem de
impressão):

```
main.mx-auto.max-w-4xl.px-6.py-12
 ├─ a.nao-imprimir                      "← Ficha do aluno"
 ├─ RelatorioCabecalho                  <header> h1 + aluno + período + observações
 ├─ AvisoProvisorio                     div.rounded-lg.border-dashed
 ├─ RelatorioSecao #visao-geral         CardsResumo        (3 cards)
 ├─ RelatorioSecao #resumo-executivo    ResumoCmj          (tabela + dl)
 ├─ RelatorioSecao #curva               CurvaTabela        (tabela)      [Provisório]
 ├─ RelatorioSecao #analise-tecnica     AnaliseTecnica     (tabela)      [Provisório]
 ├─ RelatorioSecao #medidas             MedidasTabela      (tabela)
 ├─ RelatorioSecao #historico-cmj       HistoricoCmjTabela (tabela)
 ├─ RelatorioSecao #melhorias           ListaTextos        (ul)          [Provisório]
 ├─ RelatorioSecao #pontos-atencao      ListaTextos        (ul)          [Provisório]
 ├─ RelatorioSecao #recomendacoes       Recomendacoes      (h3+p+ul ×3)  [Provisório]
 ├─ RelatorioSecao #conclusao           <p> ou EmptyState              [Provisório]
 └─ footer                              "Relatório gerado em …"
```

### 2.2 Componentes existentes

13 arquivos em `src/features/relatorio/` (11 componentes + `tipos.ts` +
`rotulos.ts`), todos Server Components, todos recebendo dados por props, nenhum
com estado, `useEffect`, `matchMedia` ou altura fixa — conforme a proibição da
E2 §12.4. **A estrutura está pronta para o Print CSS; nenhum componente da E2
precisa ser reescrito.**

### 2.3 CSS existente

`src/app/globals.css` tem **26 linhas** e está **exatamente como o scaffold
inicial do Next** o criou (`git log -- src/app/globals.css` devolve um único
commit, `1054d0f Scaffold inicial do gym-app`):

```css
@import "tailwindcss";
:root { --background: #ffffff; --foreground: #171717; }
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
body { background: var(--background); color: var(--foreground);
       font-family: Arial, Helvetica, sans-serif; }
```

Não existe **nenhuma** regra `@media print` no projeto. Não existe `@page`.

### 2.4 Classes preparatórias

| Classe | Onde | Estado |
| --- | --- | --- |
| `nao-imprimir` | `page.tsx:51`, no link "← Ficha do aluno" — **única ocorrência** | **sem nenhuma regra CSS**; hoje não faz nada |
| `relatorio-secao` | `RelatorioSecao.tsx:29`, em todas as 10 seções | **sem nenhuma regra CSS**; hoje não faz nada |

São ganchos puros, exatamente como a E2 §12.2 planejou. A E3 é quem lhes dá
significado.

### 2.5 Tokens da Nova ausentes — impacto medido

Confirmado em runtime (`getComputedStyle` no `:root`):
`--card`, `--muted-foreground`, `--border` → **string vazia**. Consequências
reais, medidas, e não hipotéticas:

| Utilitário | Efeito real hoje |
| --- | --- |
| `bg-card` | `background-color: rgba(0,0,0,0)` — cartão transparente |
| `text-muted-foreground` | não gera CSS → herda `--foreground`; **texto "secundário" fica idêntico ao primário** |
| `border-border`, `border-b` | cor cai em `currentColor` → bordas na cor do texto |
| `ring-1 ring-foreground/10` | funciona (depende de `--foreground`, que existe) — é o **único** contorno dos cartões, e é um `box-shadow` |
| `bg-muted` (Skeleton) | transparente — só afeta `loading.tsx` |

**Consequência para a E3:** a perda é de **hierarquia visual**, não de
legibilidade. Nada some. E — ponto central desta spec — **a impressão não precisa
dos tokens da Nova**: ela define seu próprio contrato de cor (§6.3), em duas
variáveis que já existem. Resolver os tokens globalmente permanece **fora de
escopo e é motivo de parada obrigatória** (§17).

### 2.6 Problemas observados no print preview — evidência empírica

Método: Chrome 150 headless, `Page.printToPDF` com `paperWidth 8.27in`,
`paperHeight 11.69in`, margens `0.5in`, `preferCSSPageSize`, `printBackground:false`
(o padrão do diálogo), `Emulation.setEmulatedMedia media=print`. Texto extraído
do PDF **página a página** resolvendo as fontes subset via `ToUnicode` CMap.
Alvo: relatório mais rico do seed — Ana Prado, avaliação de **30/04/2026**
(`78683421-734c-4809-b714-891bc9ff7765`): 5 pontos de curva, ajuste presente,
9 medidas, 8 pontos de histórico, 3 melhorias, 2 pontos de atenção,
3 recomendações, conclusão.

**Resultado do estado atual: 4 páginas A4.** Defeitos confirmados:

| # | Defeito | Evidência |
| --- | --- | --- |
| **D1** | **Tema escuro imprime ilegível.** Em `prefers-color-scheme: dark`, o texto é desenhado com `.9294 .9294 .9294 rg` e `.6 .6 .6 rg` — cinza quase branco — sobre papel branco, porque o fundo escuro **não** é impresso (backgrounds desligados é o padrão do diálogo). | operadores de preenchimento extraídos de `ana-dark-nobg.pdf` |
| **D2** | **Cabeçalho de tabela órfão.** A página 1 termina com o `thead` da tabela da curva ("Teste / Carga (kg) / Velocidade (m/s)") e **zero linhas**; as 5 linhas aparecem na página 2, com o cabeçalho repetido. | texto das páginas 1 e 2 |
| **D3** | **Tabela de medidas partida com linha órfã.** 8 linhas na página 2; a 9ª (`CMJ 43,53`) sozinha na página 3, com cabeçalho repetido. | texto das páginas 2 e 3 |
| **D4** | **Seção "Recomendações de treino" partida.** Bloco "Forca" na página 3; "Potencia" e "Velocidade" na página 4. | texto das páginas 3 e 4 |
| **D5** | **O link "← Ficha do aluno" é impresso**, apesar da classe `nao-imprimir` — que não tem regra CSS. | texto da página 1 |
| **D6** | **URL de `localhost` embutida no PDF.** O link vira anotação `/Subtype /Link` com `/URI (http://localhost:3000/alunos/8b4dfdff-…)`. Não aparece como texto visível, mas viaja no arquivo compartilhado. | 1 anotação `/Subtype /Link` no PDF |
| **D7** | **Sem `@page`.** Tamanho de papel e margens ficam inteiramente à mercê do diálogo; o layout nunca foi desenhado para uma caixa conhecida. | `globals.css` |
| **D8** | **`main` desperdiça largura útil.** `max-w-4xl mx-auto px-6` continua ativo no papel. | `page.tsx:48` |

### 2.7 O que **já** está correto e não deve regredir

- **Nenhuma página em branco** no estado atual.
- **Nenhum estouro horizontal em A4**: as 5 tabelas medem `scrollWidth == clientWidth == 635px` na largura útil.
- **Chrome não imprime a URL depois do texto do link** (comportamento de Firefox
  com `content: attr(href)` — não é o caso aqui). Nada a fazer para "evitar"
  isso; ver §6.9.
- **`thead` já repete** entre páginas (`display: table-header-group` é o padrão e
  funciona) — o problema de D2/D3 é *quando* a quebra acontece, não a repetição.
- **Responsividade em tela**, medida em `media=screen`:

  | largura | rolagem horizontal da página | tabelas com rolagem interna |
  | --- | --- | --- |
  | 360 px | não | 3 |
  | 768 px | não | 0 |
  | 1280 px | não | 0 |

- **Data de emissão já existe** no rodapé (`page.tsx:129`).

### 2.8 Prova de conceito validada

Um bloco `@media print` candidato foi injetado **em memória** (via CDP, sem tocar
em nenhum arquivo) e o PDF regerado. Resultado, com `prefers-color-scheme: dark`
e backgrounds desligados — o pior cenário:

| Medida | Antes | Depois |
| --- | --- | --- |
| Páginas A4 | 4 | **3** |
| Cor do texto | `.9294` (cinza claro) | `rgb(0,0,0)` |
| Seções partidas | 3 (D2, D3, D4) | **0** |
| Cabeçalhos de tabela órfãos | 1 | **0** |
| Link de navegação impresso | sim | não |
| Anotações de link com `localhost` | 1 | **0** |
| Páginas em branco | 0 | 0 |

**Calibragem de tipografia × paginação**, medida nas mesmas condições:

| Variante | Páginas | Corpo de tabela |
| --- | --- | --- |
| só regras de quebra | 4 | 14 px (10,5 pt) |
| **quebras + espaçamento reduzido** | **3** | **14 px (10,5 pt)** |
| quebras + espaçamento + `html{font-size:14px}` | 3 | 12,25 px (9,2 pt) |
| quebras + espaçamento + `html{font-size:12px}` | 3 | 10,5 px (7,9 pt) |

**Conclusão que a E3 deve seguir: não encolher a fonte raiz.** Reduzir
espaçamento vertical (margem entre seções e padding de célula) já entrega
3 páginas mantendo o corpo em 10,5 pt — tamanho confortável para papel.
Encolher a raiz não ganha nenhuma página e só custa legibilidade.

---

## 3. Decisão arquitetural

### 3.1 Alternativas

| Abordagem | Avaliação |
| --- | --- |
| **HTML + Print CSS + `window.print()`** | Uma árvore de componentes, um sistema de estilo, HTML acessível de verdade, zero dependência, zero JavaScript além de um `onClick`. Custo: paginação é do motor do navegador — controlável com `break-inside`, não milimétrica; sem número de página via CSS. |
| `@react-pdf/renderer` | `StyleSheet` própria, **não aceita CSS nem Tailwind** → duplicação de 100% do relatório numa segunda linguagem de estilo. Geração no servidor exige Route Handler em `src/app/api/**` — **território do backend**. Geração no cliente carrega ~1 MB para produzir o mesmo arquivo que `Ctrl+P` produz de graça. |
| Geração server-side (Puppeteer/Playwright) | Exige rota em `src/app/api/**` e um binário de navegador no servidor. Fora do escopo do frontend e desproporcional para um MVP demonstrado numa máquina local. |
| Captura de HTML (`html2canvas`, `html2pdf`) | Rasteriza: texto vira imagem — sem seleção, sem busca, sem leitor de tela, e serrilhado ao imprimir. Falha nos dois requisitos que mais importam aqui. |

### 3.2 Escolha final

**HTML + Print CSS + `window.print()`.** Confirmada, não reaberta.

| Critério | Justificativa |
| --- | --- |
| Manutenção | Um relatório só. Mudança de fórmula ou de texto do backend aparece em tela e em papel no mesmo commit. |
| Duplicação | Zero. É exatamente o motivo pelo qual `frontend-plan.md` §8.4 recusou o `@react-pdf/renderer`. |
| Qualidade | A prova de conceito de §2.8 entrega 3 páginas A4, sem seções partidas, com corpo em 10,5 pt e texto vetorial selecionável. |
| Custo | Um arquivo de ~15 linhas de TSX e um bloco CSS. Nenhuma dependência nova, nenhum aumento de bundle. |
| Compatibilidade | `window.print()` e `@media print` são universais. Chrome/Edge são os navegadores da demo, e a validação foi feita no motor deles. |
| Risco | Baixo e reversível: se o Print CSS decepcionar, ele é removível sem tocar em nenhum componente. |
| Experiência da demo | `Ctrl+P` → "Salvar como PDF" é o fluxo que o professor já conhece. Não há nada novo a ensinar. |

### 3.3 Limitações aceitas conscientemente

1. **Sem número de página via CSS.** `@page { @bottom-right { content: counter(page) } }`
   não é suportado pelo Chrome. O diálogo nativo oferece cabeçalho/rodapé com
   número de página e data como opção do usuário — é o suficiente.
2. **Sem cabeçalho repetido em todas as páginas.** É tecnicamente possível com
   `position: fixed`, mas exige reservar margem manualmente e sobrepõe conteúdo
   quando erra. Para um relatório de 3 páginas o custo/risco não se paga.
   **Decisão: não fazer.** O `<title>` do documento (§4.6) cobre a identificação
   no arquivo salvo.
3. **Paginação não é determinística entre navegadores.** Validada em Chrome/Edge,
   que são os navegadores da demo.

---

## 4. Experiência do usuário

### 4.1 Localização da ação

Uma barra de ações no topo de `page.tsx`, **na mesma linha** do link de volta,
que passa a ser um contêiner flex com a classe `nao-imprimir`:

```
[← Ficha do aluno]                                  [Imprimir / Salvar PDF]
```

Motivo: é o primeiro lugar onde o olho chega, não empurra o `<h1>` para baixo, e
o contêiner inteiro some na impressão com uma regra só.

### 4.2 Texto do botão

**"Imprimir / Salvar PDF"** — literal, com essa barra e esse espaçamento. Nomeia
as duas coisas que o usuário quer fazer e evita a pergunta "e para gerar PDF?".

### 4.3 Comportamento

`onClick={() => window.print()}`. Nada mais. Sem `useState`, sem `useEffect`, sem
`setTimeout`, sem manipular `document.title` no clique.

### 4.4 Feedback

**Nenhum.** O diálogo nativo é o feedback: aparece imediatamente e é modal.
Spinner ou toast seriam ruído sobre uma ação síncrona. **Não** desabilitar o
botão durante a impressão.

### 4.5 Diálogo nativo e cancelamento

`window.print()` abre o diálogo nativo do navegador. A página não muda de estado
em nenhum momento, então **cancelar não exige tratamento**: a tela volta
exatamente como estava. Não registrar `beforeprint`/`afterprint`.

### 4.6 Título do documento

O `<title>` atual vem do layout raiz e é **`"gym-app"`** — ou seja, o PDF salvo
sai chamado `gym-app.pdf`, para todos os alunos e todas as avaliações. Isso
inviabiliza o compartilhamento na prática.

**Decisão:** a rota passa a exportar `generateMetadata`, produzindo um título no
formato:

```
Relatório — Ana Prado — 30/04/2026
```

O Chrome usa o `<title>` como nome de arquivo sugerido ao salvar como PDF e como
texto do cabeçalho opcional do diálogo. Detalhes de implementação em §8.3.

### 4.7 Mobile

O botão permanece visível e funcional. `window.print()` é suportado no Chrome
Android e no Safari iOS, abrindo o fluxo nativo de impressão/PDF. Nenhum
tratamento condicional por viewport — isso violaria a E2 §12.4.

### 4.8 Teclado

`<Button>` renderiza um `<button>` real: focável na ordem natural, acionável por
`Enter` e `Espaço`. O foco visível já é garantido pelo fallback
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current`
que o projeto adotou em `button.tsx` justamente porque os tokens `--ring`/`--border`
não existem. **Não** adicionar `tabIndex`.

### 4.9 Leitor de tela

O nome acessível é o próprio texto do botão. Não usar `aria-label` (duplicaria o
nome), não usar `title`, não anunciar nada por `aria-live` — a ação não produz
mudança na página.

---

## 5. Estrutura impressa

Ordem exata no papel — idêntica à ordem do DOM, que é idêntica à ordem em tela.
**Nenhum elemento é reordenado para impressão.**

| # | Bloco | Impresso? |
| --- | --- | --- |
| — | Barra de ações (link de volta + botão) | **não** (`nao-imprimir`) |
| 1 | `<h1>` "Relatório de performance" | sim |
| 2 | Identificação do aluno + data da avaliação de referência | sim |
| 3 | Contexto: período do histórico + nº de avaliações com CMJ | sim |
| 4 | Observações da avaliação, quando existirem | sim |
| 5 | Aviso de conteúdo provisório (3 itens vindos da API) | **sim** |
| 6 | Visão geral — 3 cartões (CMJ, Score, Perfil) | sim |
| 7 | Resumo executivo — tabela de marcos + variações | sim |
| 8 | Curva força-velocidade | sim |
| 9 | Análise técnica | sim |
| 10 | Medidas da avaliação | sim |
| 11 | Histórico de CMJ | sim |
| 12 | Melhorias identificadas | sim |
| 13 | Pontos de atenção | sim |
| 14 | Recomendações de treino | sim |
| 15 | Conclusão | sim |
| 16 | Rodapé — data de emissão + ressalva de provisoriedade | sim |

O cabeçalho impresso é o bloco 1–4 (`RelatorioCabecalho`), já existente. **Não
criar um componente de cabeçalho separado para impressão** — seria a duplicação
que §3 recusa.

---

## 6. Regras de impressão

Todas as regras vivem em **um único bloco** no fim de `src/app/globals.css`,
precedido de um comentário explicando *por quê* (padrão do projeto), e a regra
`@page` no nível de topo do arquivo.

### 6.1 `@page`

```css
@page {
  size: A4 portrait;
  margin: 14mm 12mm;
}
```

Tamanho A4 retrato explícito. Margens laterais menores que as verticais porque a
largura é o recurso escasso (tabelas de 3 colunas). Valores exatos são
autonomia do implementador dentro de **12–16 mm**; o que não é negociável é
haver `@page` com `size: A4 portrait`.

### 6.2 Largura e caixa

```css
main { max-width: none !important; padding: 0 !important; }
```

A caixa passa a ser a área útil do `@page`. `!important` é necessário para vencer
os utilitários do Tailwind (`max-w-4xl`, `px-6`, `py-12`) e é aceitável **apenas
dentro de `@media print`**.

### 6.3 Contrato de cor — a regra mais importante desta spec

```css
:root {
  --background: #ffffff;
  --foreground: #000000;
  color-scheme: light;
}
```

**Por que isto resolve D1 sozinho:** `globals.css` usa `@theme inline`, que
mantém a referência `var()` viva em vez de resolvê-la no build. Redefinir
`--background`/`--foreground` no `:root` dentro de `@media print` propaga para
`body`, para `text-foreground`, para `ring-foreground/10` e para toda cor que
caia em `currentColor`. Como o bloco `@media print` vem **depois** do bloco
`@media (prefers-color-scheme: dark)` e tem a mesma especificidade, ele vence.

**Verificado empiricamente:** com essas três linhas, em `media=print` +
`prefers-color-scheme: dark`, `body`, `h1`, `[data-slot=card-description]` e a
borda de `tbody tr` passam todos de cinza-claro para `rgb(0, 0, 0)`.

`#000000` em vez de `#171717`: no papel o contraste máximo é gratuito e a
economia de tinta é irrelevante num relatório de 3 páginas.

**Proibido nesta etapa:** introduzir `--card`, `--muted-foreground`, `--border`
ou qualquer outro token da Nova, mesmo escopado a `@media print`. Se a impressão
precisar de um cinza de apoio, declarar uma variável **local do bloco de
impressão** com nome próprio (ex.: `--impressao-cinza`) e usá-la só ali.

### 6.4 Fundo

**Não** usar `print-color-adjust: exact` nem `-webkit-print-color-adjust`. A
impressão é desenhada para funcionar **sem nenhum fundo**, porque "Gráficos de
plano de fundo" vem desmarcado no diálogo do Chrome. Informação transmitida por
fundo é informação perdida.

Consequência de desenho: o contorno dos cartões e do aviso provisório deve ser
uma **borda real** (`border`), não `box-shadow`/`ring`. Regra:

```css
[data-slot="card"] { border: 1px solid currentColor; box-shadow: none; }
```

> Nota de honestidade: no Chrome 150 headless, com `printBackground:false`, o
> `ring-1` dos cartões **sobreviveu** (o `ExtGState` de alpha 0.1 continuou
> presente no PDF). Ainda assim, converter para `border` é o desenho correto:
> `box-shadow` é decoração de fundo por natureza e não há garantia de
> comportamento entre navegadores nem entre versões. O implementador deve
> confirmar visualmente que a borda aparece com backgrounds desligados.

### 6.5 Fontes, tamanhos e entrelinha

**Não alterar `font-family` na impressão.** A tela usa
`Arial, Helvetica, sans-serif` (`globals.css:25` sobrescreve a Geist carregada em
`layout.tsx` — pendência da E0, registrada em §11, **fora do escopo da E3**).
Mudar a família só na impressão criaria divergência entre o que o professor vê e
o que sai no papel. Arial imprime bem.

**Não alterar `html { font-size }`.** Ver a calibragem de §2.8: encolher a raiz
não ganha nenhuma página e custa 1,3 pt de corpo.

Alvos de tamanho computado, a conferir no papel:

| Elemento | Alvo |
| --- | --- |
| Corpo de tabela / texto corrido | ≈ 14 px (10,5 pt) — **não reduzir** |
| `<h2>` de seção | ≈ 18 px (13,5 pt) |
| `<h1>` | ≈ 24 px (18 pt) |
| Rodapé e legendas | ≥ 12 px (9 pt) |

Entrelinha: manter a da tela. Se algum bloco ficar apertado, ajustar
pontualmente, nunca globalmente.

### 6.6 Espaçamento — a alavanca de paginação

É aqui, e **só** aqui, que se ganha a página:

```css
.relatorio-secao { margin-top: 1.1rem; }
th, td { padding-top: .25rem; padding-bottom: .25rem; }
[data-slot="table-head"] { height: auto; }
```

(`[data-slot="table-head"]` tem `h-10` fixo no primitivo do shadcn; soltar a
altura é o que permite o padding menor valer.)

Valores exatos são autonomia do implementador. **O alvo é 3 páginas com o corpo
em 10,5 pt** para o relatório de referência de §2.6.

### 6.7 Quebra de página

```css
.relatorio-secao      { break-inside: avoid; }
[data-slot="card"]    { break-inside: avoid; }
tr                    { break-inside: avoid; }
thead                 { display: table-header-group; }
h1, h2, h3            { break-after: avoid; }
```

Racional:

- **`break-inside: avoid` na seção resolve D2, D3 e D4 de uma vez.** As 10 seções
  medem no máximo 441 px contra 1026 px de altura útil — todas cabem. Um cabeçalho
  de tabela órfão é, por definição, uma seção partida no pior lugar.
- **Degradação graciosa:** se uma seção futura passar de uma página (ex.: 21
  pontos de CMJ), o navegador **ignora** `break-inside: avoid` e quebra
  normalmente. Não corta, não some. Por isso a regra é segura mesmo com dados
  maiores que os do seed.
- **`thead { display: table-header-group }`** é o padrão, mas fica declarado de
  propósito: é o que garante repetição do cabeçalho **quando** a degradação
  graciosa acontecer.
- **`h1, h2, h3 { break-after: avoid }`** impede título no pé de página.

**Nenhum `break-before: page` em lugar nenhum.** Investigação item 13: **nenhuma
seção precisa começar em página nova.** Forçar quebras num relatório de 3 páginas
só produziria espaço morto e risco de página em branco. Se no futuro o relatório
crescer e uma seção merecer página própria, isso será uma decisão nova.

### 6.8 Tabelas

```css
[data-slot="table-container"] { overflow: visible !important; }
```

O primitivo `Table` envolve `<table>` num `div.overflow-x-auto` (necessário e
correto em tela — é o que evita rolagem horizontal da página em 360 px). No
papel, um ancestral com `overflow` pode recortar conteúdo e atrapalhar a
fragmentação. Soltar para `visible` na impressão é seguro porque, na largura útil
do A4, **nenhuma tabela estoura** (medido: `scrollWidth == clientWidth`).

Se alguma tabela vier a estourar no futuro, a saída é reduzir o padding ou o
tamanho de fonte **daquela tabela**, nunca reintroduzir rolagem no papel.

### 6.9 Links

```css
a { text-decoration: none; color: inherit; }
```

O único link do relatório está dentro da barra `nao-imprimir` e some inteiro, o
que também elimina a anotação `/URI` com `localhost` (D6 — verificado: 1
anotação antes, 0 depois).

**Não** adicionar `a[href]::after { content: " (" attr(href) ")" }`. Investigação
item 15: **o Chrome não imprime a URL depois do texto** — não há nada para
"evitar". A regra acima existe só para o caso de algum link surgir dentro do
conteúdo no futuro.

### 6.10 Botões, navegação e controles

```css
.nao-imprimir { display: none !important; }
```

`display: none` (e não `visibility: hidden`) para não deixar espaço em branco.
Tudo que é controle de tela recebe essa classe. Hoje: a barra de ações inteira.

### 6.11 Rodapé

O `<footer>` existente permanece, com `break-inside: avoid`. Conteúdo: data de
emissão + ressalva de provisoriedade. Refinamento obrigatório da data em §7.

### 6.12 Seções vazias e mensagens de estado

**`EmptyState` continua visível na impressão.** Uma seção que aparece vazia no
papel sem dizer por quê é lida como falha do sistema. "Nenhum CMJ registrado no
histórico" impresso é informação; um espaço em branco não é.

`.sr-only` continua fora do papel (é `position:absolute` + clip) — correto: o
traço `—` é visto, o "não medido" é ouvido. **Não** transformar `sr-only` em
visível na impressão.

### 6.13 Páginas em branco

Não há página em branco hoje, nem apareceu na prova de conceito. **Não adicionar
regras preventivas sem sintoma.** Se uma página em branco final surgir durante a
implementação, a causa quase certa é `body.min-h-full.flex.flex-col`
(`layout.tsx:29`), e a correção pontual é:

```css
body { min-height: 0 !important; display: block !important; }
```

Aplicar **só se o sintoma existir**, e registrar no relatório final.

---

## 7. Regras por componente

`src/features/relatorio/`. "Alteração necessária" refere-se ao **arquivo do
componente**; regras aplicadas de fora, pelo Print CSS, não contam como alteração.

| Componente | Em tela | Na impressão | Pode quebrar? | Inicia página? | Oculto | Alteração no arquivo |
| --- | --- | --- | --- | --- | --- | --- |
| `RelatorioSecao` | `<section>` + `<h2>` + selo | idem, `break-inside: avoid` | não | não | — | **nenhuma** |
| `RelatorioCabecalho` | h1 + aluno + período + observações | é o cabeçalho impresso | não | é a página 1 | — | **nenhuma** |
| `AvisoProvisorio` | caixa tracejada | **mantido**, borda sólida `currentColor` | não | não | — | **nenhuma** |
| `CardsResumo` | grid 1→3 colunas | 3 colunas, borda real no lugar do `ring` | não (cartão) | não | — | **nenhuma** |
| `ResumoCmj` | tabela + `dl` de variações | idem | não | não | — | **nenhuma** |
| `CurvaTabela` | frase de carga máxima + tabela | idem | não | não | — | **nenhuma** |
| `AnaliseTecnica` | tabela de 6 métricas | idem | não | não | — | **nenhuma** |
| `MedidasTabela` | tabela de 9 linhas, `<abbr title>` | idem; a sigla imprime sozinha (é o vocabulário do professor) | não | não | — | **nenhuma** |
| `HistoricoCmjTabela` | nota + tabela | idem | não (hoje); se passar de uma página, quebra com `thead` repetido | não | — | **nenhuma** |
| `ListaTextos` | `<ul>` | idem | não | não | — | **nenhuma** |
| `Recomendacoes` | 3 blocos h3+p+ul | idem, blocos inteiros | não | não | — | **nenhuma** |
| `rotulos.ts` / `tipos.ts` | — | — | — | — | — | **nenhuma** |

**Nenhum componente da E2 é alterado.** Isso é resultado direto da preparação da
E2 §12 e é um critério de aceite (§11).

Estados de rota:

| Arquivo | Impressão |
| --- | --- |
| `loading.tsx` | irrelevante (não se imprime um esqueleto); nenhuma regra |
| `error.tsx` | contém um `<Button>`; deve ganhar `nao-imprimir` no botão? **Não** — imprimir uma tela de erro não é caso de uso. Nenhuma regra. |
| `not-found.tsx` | idem. Nenhuma regra. |

---

## 8. Arquitetura Server/Client

### 8.1 A página continua Server Component

`page.tsx` **não** recebe `"use client"`. É a regra central de
`frontend-plan.md` §2.2: um botão com `onClick` não pode arrastar as 11 seções do
relatório para o bundle do cliente.

### 8.2 O componente Client mínimo

`src/features/relatorio/AcaoImprimir.tsx`:

- `"use client"` na primeira linha.
- Sem props, ou no máximo uma `className` opcional. **Não** recebe dados do
  relatório — não precisa de nenhum.
- Renderiza um `<Button>` de `@/components/ui/button` com
  `onClick={() => window.print()}`.
- Sem estado, sem efeito, sem import de `@/lib/*`.

Fronteira: `page.tsx` (Server) importa e renderiza `<AcaoImprimir />` (Client).
Nada além desse arquivo cruza para o cliente. Precedente já provado no projeto:
`error.tsx` é Client e usa `ErrorState`, que usa `Button`.

**Verificação obrigatória:** `npm run build` deve continuar mostrando a rota como
`ƒ` (dinâmica) e o First Load JS não deve saltar de ordem de grandeza. Registrar
o número antes e depois no relatório final.

### 8.3 `generateMetadata` e dedupe da chamada

Para o título de §4.6, `page.tsx` passa a exportar `generateMetadata`, que
precisa do nome do aluno e da data — ou seja, do mesmo relatório que a página já
busca.

**Decisão:** extrair a busca para `src/features/relatorio/dados.ts`:

```ts
export const carregarRelatorio = cache(async (id: string) => { … });
```

usando `cache()` do React — exatamente o uso previsto em `frontend-plan.md` §5.4
("`cache()` do React apenas para dedupe dentro de uma mesma requisição").
`generateMetadata` e o componente da página chamam a mesma função; a chamada HTTP
acontece uma vez.

Regras:

- `dados.ts` é Server-only por natureza (usa `origemAtual()`, que lê `headers()`).
  **Nunca** importar em arquivo com `"use client"`.
- `generateMetadata` **não pode lançar**. Em qualquer falha, devolver um título
  genérico (`"Relatório"`); quem trata 404 e erro é o componente da página, que
  continua com `notFound()` / `throw` exatamente como está.
- O título usa `formatarData` de `features/shared/formato.ts` — nunca `new Date`
  sobre a string ISO curta (`frontend-plan.md` R5).
- **Se o dedupe não se confirmar** (duas requisições no log do servidor), isso
  **não é bloqueio**: uma chamada HTTP local extra é irrelevante neste projeto.
  Registrar o fato no relatório final e seguir.

### 8.4 Data de emissão

`page.tsx:129` usa `new Date().toLocaleDateString("pt-BR")`. É cálculo de
**apresentação**, permitido por `frontend-plan.md` §1.4. Dois ajustes obrigatórios:

1. Fixar o fuso: `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })`.
   Sem isso, o servidor em UTC pode imprimir a data de ontem à noite — a mesma
   classe de bug do risco R5.
2. O helper vai para `features/shared/formato.ts` (ex.: `dataDeHojeFormatada()`),
   não fica solto na página, seguindo a regra de `frontend-plan.md` §3
   ("se um arquivo em `src/app/**` passa de composição e busca de dados, o
   excedente vai para `features/`").

---

## 9. Estrutura de arquivos

### 9.1 Criados

| Arquivo | Conteúdo |
| --- | --- |
| `src/features/relatorio/AcaoImprimir.tsx` | Client Component mínimo, `window.print()` |
| `src/features/relatorio/dados.ts` | `carregarRelatorio` com `cache()` |

### 9.2 Alterados

| Arquivo | Alteração |
| --- | --- |
| `src/app/globals.css` | `@page` + bloco `@media print` |
| `src/app/avaliacoes/[id]/relatorio/page.tsx` | barra de ações, `generateMetadata`, uso de `dados.ts`, rodapé |
| `src/features/shared/formato.ts` | helper de data de emissão com fuso fixo |
| `docs/e3-implementation-spec.md` | marcações de estado, se necessário |

### 9.3 Preservados — não tocar sem necessidade comprovada

Os 11 componentes de `src/features/relatorio/` (§7), `tipos.ts`, `rotulos.ts`,
`loading.tsx`, `error.tsx`, `not-found.tsx`, `src/components/ui/**`,
`src/app/layout.tsx`, `src/features/alunos/**`, `src/features/shared/api.ts`,
`erros.ts`, `origem.ts`.

Se algum precisar mudar, isso é sinal de que o Print CSS está resolvendo no lugar
errado — reavaliar antes de editar.

### 9.4 Protegidos — parada obrigatória

`prisma/**` · `src/app/api/**` · `src/lib/**` · `src/generated/**` ·
`package.json` · `package-lock.json` · `components.json` · `eslint.config.mjs` ·
`prisma/dev.db`.

---

## 10. Acessibilidade

| Item | Exigência |
| --- | --- |
| Nome acessível da ação | O texto "Imprimir / Salvar PDF" é o nome. Sem `aria-label`, sem `title`. |
| Foco | Visível pelo fallback `focus-visible:outline-*` de `button.tsx`. Não remover, não substituir por `ring-*` (os tokens não existem). |
| Teclado | `<button>` nativo, ordem natural do DOM: link de volta → botão → conteúdo. Sem `tabIndex`. |
| Não depender de cor | Já garantido: cada selo "Provisório" é **texto**, não cor; nenhuma informação do relatório é transmitida por cor. Manter na impressão. |
| Conteúdo oculto visualmente | `.sr-only` permanece `sr-only` em tela e ausente do papel. `.nao-imprimir` é `display:none` **só** em `@media print` — nunca em tela. |
| Ordem de leitura | Ordem do DOM = ordem visual = ordem impressa, em qualquer viewport. Nenhuma reordenação por CSS (`order`, `flex-direction: column-reverse`, `position`). |
| Links | Único link fica na barra oculta na impressão; sem URL colada no texto. |
| Valores ausentes | `ValorOuAusente` inalterado: `—` visível + `não medido` para leitor de tela; `0` continua `0`. |
| Zoom 200% | Conferir em 1280 px com zoom 200% (equivale a 640 px de largura efetiva): sem rolagem horizontal da página, tabelas rolando no próprio contêiner. |
| Impressão e tecnologia assistiva | O PDF gerado é texto vetorial selecionável, não imagem — confirmado na extração de texto de §2.6. |

---

## 11. Critérios de aceite

Checklist testável. Nenhuma unidade é considerada concluída sem os itens
correspondentes verificados.

### Tela

- [ ] O relatório continua idêntico ao da E2 em 360 px, 768 px e 1280 px.
- [ ] Sem rolagem horizontal da página em nenhuma das três larguras.
- [ ] As 3 tabelas continuam rolando no próprio contêiner em 360 px.
- [ ] Nenhuma regra de `@media print` vaza para a tela.
- [ ] O botão é focável por teclado, com foco visível, e acionável por `Enter` e `Espaço`.

### Ação

- [ ] O botão abre o diálogo nativo de impressão.
- [ ] Cancelar o diálogo devolve a página exatamente ao estado anterior.
- [ ] `page.tsx` **não** tem `"use client"`.
- [ ] `npm run build` mantém a rota como `ƒ` (dinâmica).

### Papel

- [ ] O botão e o link "← Ficha do aluno" **não** aparecem impressos.
- [ ] O PDF sai em **A4 retrato**.
- [ ] Relatório de referência (Ana Prado, 30/04/2026): **3 páginas**.
- [ ] **Nenhuma página em branco.**
- [ ] **Nenhuma seção partida entre páginas.**
- [ ] **Nenhum cabeçalho de tabela órfão** (cabeçalho sem linhas no pé da página).
- [ ] **Nenhum título no pé de página** sem o conteúdo que ele nomeia.
- [ ] Todas as 10 seções + cabeçalho + aviso + rodapé presentes no PDF.
- [ ] Corpo de tabela ≥ 10 pt.
- [ ] Nenhuma anotação de link com `localhost` no PDF.

### Robustez

- [ ] Com `prefers-color-scheme: dark`, o texto impresso é **preto**, não cinza-claro.
- [ ] Com "Gráficos de plano de fundo" **desmarcado**, o relatório continua
      compreensível: cartões e aviso com borda visível, tabelas legíveis.
- [ ] Em escala 100% no diálogo, nada é cortado nas laterais.
- [ ] Impressão em preto e branco (escala de cinza) permanece compreensível —
      trivialmente satisfeita, já que não há cor semântica.

### Conteúdo

- [ ] Aviso de provisoriedade impresso, com os 3 textos vindos da API.
- [ ] Selos "Provisório" impressos em todas as seções que os têm.
- [ ] `0` continua `0`; `null` continua `—`. Nenhum vira o outro.
- [ ] Textos do backend impressos exatamente como vieram, sem reescrita.
- [ ] Rótulos da V3 preservados ("mais recente do histórico", "último registro do
      histórico", "avaliações com CMJ no período"); "Atual" / "Total de avaliações"
      continuam **ausentes**.
- [ ] `EmptyState` de seção vazia é impresso, não suprimido.

### Título e arquivo

- [ ] A aba do navegador mostra `Relatório — <aluno> — <data>`.
- [ ] O nome sugerido ao salvar como PDF reflete esse título.
- [ ] Falha na busca do relatório não quebra `generateMetadata`.

### Automático

- [ ] `npm run typecheck` sem erro.
- [ ] `npm run lint` sem erro nem aviso novo.
- [ ] `npm run build` conclui.
- [ ] Nenhum arquivo de `prisma/`, `src/app/api/` ou `src/lib/` alterado.
- [ ] Nenhuma dependência adicionada; `package.json` intacto.

---

## 12. Casos de teste

### 12.1 O que o seed cobre — e o que não cobre

Os 16 relatórios do seed são **quase idênticos em volume**: todos com 5 pontos de
curva, ajuste presente, 9 medidas, textos preenchidos. A única variação real é o
tamanho do histórico de CMJ (3, 5 ou 8 pontos). **Não existe no seed um relatório
curto, um texto longo, uma seção vazia, um `null` ou um score extremo.**

| Cenário | Coberto pelo seed? |
| --- | --- |
| Relatório longo (8 pontos de histórico) | ✅ Ana Prado, 30/04/2026 |
| Relatório curto (3 pontos) | ✅ Carla Menezes, 30/04/2026 |
| Divergência V3 (histórico à frente da avaliação) | ✅ Ana Prado, 10/07/2025 |
| Texto longo, tabela larga, seção vazia, `null`, `0`, score 0/100 | ❌ **nenhum** |

### 12.2 Método obrigatório para o que falta

**Idêntico ao validado na E1 e na E2:** alteração **temporária, mínima e
reversível** em `page.tsx`, marcada com comentário
`// TESTE-TEMPORARIO-E3-<rodada> — reverter antes do commit`, inserida logo após
a obtenção do relatório; conferência via PDF gerado; **reversão imediata**; e
`git diff` conferido **vazio** antes de prosseguir.

**Proibido:** alterar o banco, rodar `db:seed`, `db:reset`, ou escrever pela API.

### 12.3 Rodadas

| Rodada | Forçar | Verificar no papel |
| --- | --- | --- |
| A | *(sem alteração)* Ana Prado 30/04/2026 | 3 páginas, zero seção partida, zero cabeçalho órfão |
| B | *(sem alteração)* Carla Menezes 30/04/2026 (histórico de 3) | relatório curto: menos páginas, **sem página em branco no fim** |
| C | *(sem alteração)* Ana Prado 10/07/2025 | rótulos V3 preservados na impressão |
| D | `textos.conclusao` repetido ~40× (texto muito longo) | quebra entre páginas sem perder texto; `<h2>` não fica órfão |
| E | `historicoCmj` duplicado até ~40 linhas (tabela mais alta que uma página) | degradação graciosa: seção quebra e **`thead` repete** na página seguinte |
| F | `medidasDetalhadas` com uma medida `null` e outra `0` | `—` × `0` no papel, sem confusão |
| G | `textos = { melhorias: [], pontosAtencao: [], recomendacoes: [], conclusao: "" }` | as 4 seções imprimem `EmptyState`, não espaço vazio |
| H | `resumoCmj = null`, `historicoCmj = []`, `curva.pontos = []`, `curva.ajuste = null` | `EmptyState` impresso em todas; nenhuma página em branco |
| I | `score = { valor: 0, nivel: "Sem dados" }` e `{ valor: 100, nivel: "Alto" }` | cartão de score legível nos dois extremos |
| J | uma tabela forçada a estourar a largura útil (ex.: rótulo de métrica muito longo) | conteúdo não é recortado no papel (efeito de `overflow: visible`) |

### 12.4 Condições de diálogo a cobrir

Para a rodada A, no mínimo, cobrir a matriz:

| Condição | Valores |
| --- | --- |
| Esquema de cor do sistema | claro **e escuro** |
| Gráficos de plano de fundo | ligado **e desligado** |
| Papel | A4 |
| Orientação | retrato |
| Escala | 100% |
| Margens | padrão |

Salvar como PDF e cancelar a impressão devem ambos ser exercitados manualmente
ao menos uma vez.

---

## 13. Validação visual

### 13.1 Ferramentas

- **Chrome ou Edge** — os navegadores da demo.
- `Ctrl+P` → pré-visualização de impressão, para a inspeção humana.
- **DevTools → Rendering → "Emulate CSS media type: print"** e **"Emulate CSS
  `prefers-color-scheme`"**, para inspecionar estilo computado sem sair da página.
- Geração de PDF por linha de comando para inspeção repetível e página a página.

### 13.2 Roteiro repetível

A investigação que produziu esta spec usou, e o implementador pode reusar:

1. `npm run dev` com o servidor em `localhost:3000`.
2. Chrome headless com `--remote-debugging-port`, `Page.printToPDF` em
   `paperWidth 8.27`, `paperHeight 11.69`, margens `0.5in`, `preferCSSPageSize:true`,
   `printBackground:false`, e `Emulation.setEmulatedMedia` para alternar
   `media` e `prefers-color-scheme`.
3. Contagem de páginas do PDF pela contagem de `/Type /Page`.
4. Extração de texto **por página** para provar o que caiu em cada folha.
5. Screenshot em `media=print` para inspeção visual.

Alternativa mais simples, igualmente aceitável:
`chrome --headless --print-to-pdf=<saida.pdf> --no-pdf-header-footer <url>`
seguida de abertura manual do PDF.

### 13.3 Inspeção obrigatória, página a página

Para cada PDF gerado nas rodadas de §12.3, conferir folha por folha:
nenhum corte, nenhuma seção partida, nenhum cabeçalho de tabela sem linhas,
nenhuma folha em branco, nenhum título isolado no pé.

### 13.4 Artefatos de teste

PDFs, PNGs, scripts de inspeção e logs **não são versionados**. Gerar fora da
árvore do projeto (diretório temporário) ou, se dentro, apagar antes do commit.
`git status` deve estar limpo de artefatos em todo commit. **Não** criar nem
alterar `.gitignore` para isso.

---

## 14. Plano de execução

Cinco unidades, implementáveis **numa única sessão**, sem aprovação entre elas.

### U1 — Ação de impressão e fronteira Client

**Objetivo.** Botão funcionando, página ainda Server, nenhum CSS de impressão.
**Arquivos.** Criar `features/relatorio/AcaoImprimir.tsx`; alterar `page.tsx`
(barra de ações com o link de volta + botão, contêiner com `nao-imprimir`).
**Validação.** `typecheck`, `lint`, `build`; rota ainda `ƒ`; First Load JS
registrado; clique abre o diálogo; `Tab` alcança o botão com foco visível.

### U2 — Base de impressão: `@page`, cor e caixa

**Objetivo.** O papel deixa de depender do tema e do diálogo.
**Arquivos.** Alterar `globals.css`: `@page` (§6.1), `@media print` com
contrato de cor (§6.3), largura/caixa (§6.2), `.nao-imprimir` (§6.10),
links (§6.9).
**Validação.** PDF A4 em tema **claro e escuro**: texto preto nos dois; barra de
ações ausente; zero anotação `/URI`; tela inalterada nas três larguras.

### U3 — Quebras e tabelas

**Objetivo.** Eliminar D2, D3 e D4.
**Arquivos.** Alterar `globals.css`: regras de quebra (§6.7), tabelas (§6.8),
espaçamento (§6.6).
**Validação.** Relatório de referência em **3 páginas**, zero seção partida, zero
cabeçalho órfão, corpo ≥ 10 pt. Rodadas D e E de §12.3 (conteúdo maior que uma
página, com degradação graciosa e `thead` repetido).

### U4 — Cabeçalho, rodapé e título do documento

**Objetivo.** O arquivo salvo se identifica sozinho.
**Arquivos.** Criar `features/relatorio/dados.ts`; alterar `page.tsx`
(`generateMetadata`, uso de `carregarRelatorio`, rodapé) e
`features/shared/formato.ts` (data de emissão com fuso fixo). Ajustes de borda
de cartão e do aviso (§6.4) em `globals.css`.
**Validação.** Título na aba e no nome sugerido do PDF; contagem de chamadas
HTTP no log do servidor; falha de busca não quebra a metadata; data de emissão
correta perto da virada do dia.

### U5 — Casos de borda, acessibilidade e fechamento

**Objetivo.** Fechar a etapa.
**Arquivos.** Apenas correções apontadas pelos testes.
**Validação.** Rodadas A–J de §12.3; matriz de diálogo de §12.4; checklist
inteiro de §11; zoom 200%; `typecheck`, `lint`, `build` finais; `git status`
limpo.

---

## 15. Estratégia de commits

Um commit por unidade. Conventional Commits, **mensagem em inglês** (padrão do
repositório). **Sem aprovação humana entre commits.** Sem `push`, `merge`,
`rebase` ou troca de branch. **Sem metadados de IA** (`Co-Authored-By`,
`Claude-Session` ou equivalentes).

| # | Mensagem sugerida |
| --- | --- |
| 1 | `feat(relatorio): add print action with minimal client boundary` |
| 2 | `feat(relatorio): add A4 page setup and print color contract` |
| 3 | `feat(relatorio): control page breaks and table fragmentation` |
| 4 | `feat(relatorio): add document title, footer and issue date` |
| 5 | `fix(relatorio): cover print edge cases and accessibility` |

Ajustar a mensagem se o conteúdo real da unidade divergir. Rodar `typecheck` e
`lint` antes de cada commit; `build` em todas as unidades.

Commitar **apenas** arquivos do projeto. Nenhum PDF, PNG, log ou script de
inspeção.

---

## 16. Autonomia

### Pode decidir sozinho, sem perguntar

Nomes de variáveis, funções, componentes e classes locais · organização interna
dos arquivos · **valores exatos de margens, padding, espaçamento e tipografia**
dentro dos alvos de §6 · seletores CSS e organização do bloco `@media print` ·
ajustes por componente feitos a partir do Print CSS · breakpoints em tela, se
algum precisar de ajuste · textos auxiliares de interface em português ·
melhorias de acessibilidade além do exigido · refactors locais nos arquivos que
já está tocando · divisão exata dos commits · execução de qualquer comando não
destrutivo (`npm run *`, `git status/log/diff/show`, `curl`, subir e derrubar o
servidor local, abrir o navegador, gerar PDFs e screenshots temporários) ·
criação de commits · correção de erros locais de `typecheck`/`lint`/`build` ·
alterações temporárias reversíveis para teste (§12.2).

### Não precisa pedir aprovação para

Editar arquivos · rodar comandos · commitar · reverter o próprio trabalho ·
repetir uma unidade que não passou na validação.

---

## 17. Paradas obrigatórias

Parar, descrever o achado com evidência (caminho:linha ou saída de comando),
propor alternativas, e **aguardar decisão** — nunca contornar por conta própria:

1. Necessidade de alterar `prisma/**`, `src/app/api/**` ou `src/lib/**`.
2. Necessidade de qualquer **dependência nova** — incluindo `@react-pdf/renderer`,
   `puppeteer`, `html2pdf` ou qualquer biblioteca de PDF.
3. Mudança de arquitetura (Server/Client, consumo da API, feature-first,
   estratégia de impressão).
4. **Impossibilidade comprovada** de cumprir um requisito de §11 com Print CSS —
   com a evidência do que foi tentado.
5. Qualquer risco a dados: escrita no banco, `db:seed`, `db:reset`, alteração de
   `prisma/dev.db`.
6. Necessidade de publicar remotamente (`push`, deploy, URL pública).
7. Conflito real de contrato: campo ausente ou formato divergente de `api.md`.
8. Comando destrutivo irreversível (`git reset --hard`, `git clean -fd`,
   `rm -rf`, `checkout --` sobre trabalho não commitado).
9. **Necessidade de resolver globalmente os tokens da Nova**
   (`frontend-plan.md` §0.4) — permanece **fora de escopo**.
10. Necessidade de gráfico para cumprir um requisito da E3 (não deve haver — os
    gráficos saíram do escopo, §1.5).

---

## 18. Protocolo final

1. Ler esta spec inteira antes de escrever qualquer linha.
2. Reler `docs/frontend-plan.md` (§2.1–2.3, §4.10, §8.3–8.5) e `docs/api.md`.
3. Implementar U1 → U5, na ordem.
4. `typecheck` e `lint` ao fim de cada unidade; `build` em todas.
5. Validar no navegador e no PDF, não só no código.
6. Reverter toda alteração temporária e conferir `git diff` vazio antes de cada commit.
7. Commitar por unidade. **Sem `push`. Sem `merge`. Não avançar para a E4.**
8. Entregar relatório final com: resumo · funcionalidades entregues · arquivos
   criados/alterados · commits com hash e responsabilidade · resultados de
   `typecheck`/`lint`/`build` · testes executados **e os não executados** ·
   rodadas de borda com resultado · número de páginas antes e depois · decisões
   tomadas dentro da autonomia · divergências encontradas · pendências ·
   limitações visuais não validadas · `git status` final.

**Honestidade de relatório:** o que não foi verificado deve ser declarado como
não verificado. Não afirmar confirmação visual sem tê-la feito.

---

## 19. Pendências registradas (não resolver na E3)

| # | Pendência | Origem |
| --- | --- | --- |
| P1 | Tokens de tema da Nova ausentes — sem hierarquia visual em tela | `frontend-plan.md` §0.4 |
| P2 | `globals.css:25` sobrescreve a fonte Geist com Arial — correção prevista para a E0, nunca aplicada | `frontend-plan.md` §4.10 |
| P3 | Gráficos (`GraficoCmj`, `GraficoCurva`) e o risco R7 saíram do escopo da E3 | §1.5 desta spec |
| P4 | `frontend-plan.md` §9/E3 descreve uma etapa diferente da executada — precisa ser atualizado com decisão explícita | §1.5 desta spec |
| P5 | Sem número de página e sem cabeçalho repetido no PDF | §3.3 |
| P6 | `recharts` instalado e não usado | §1.5 |

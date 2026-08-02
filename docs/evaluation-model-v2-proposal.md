# Modelo de avaliação v2 — proposta

> **Status: proposta. Nada foi implementado.** Nenhum arquivo de frontend,
> backend, Prisma ou seed foi alterado. Este documento existe para ser revisado
> pelo produto e pelo desenvolvedor do backend **antes** de qualquer código.

## Como ler este documento

Cada afirmação é marcada. Não misture os níveis:

| Marca | Significado |
| --- | --- |
| **[CLIENTE]** | Fato confirmado pelo cliente na descoberta |
| **[CÓDIGO]** | Fato verificado no código, com `caminho:linha` |
| **[PROPOSTA]** | Sugestão nossa, aberta a mudança |
| **[DÚVIDA]** | Não sabemos; precisa de resposta |
| **[BLOQUEIO]** | Impede implementar; precisa de decisão antes de codar |

---

## 0. Estado atual do repositório

**[CÓDIGO]** Branch `refactor/evaluation-model`, a partir de `50fd2c5`
(merge de `back/apoio-front`). Working tree limpo.

**[CÓDIGO]** A **E5 não está mergeada**. Ela vive na branch
`feat/evaluation-form` (`87e7336`), irmã de `dbcfc56`, e **não está contida
nesta branch**. Consequência prática importante: o formulário de avaliação que
esta mudança invalida **ainda não entrou na main**. O custo de refazê-lo é o
custo de reescrever uma branch não publicada, não o de migrar código em
produção.

**[CÓDIGO]** O merge `50fd2c5` trouxe do backend: `atualizarAlunoSchema` agora
aceita `dataNascimento` `nullish` (`src/lib/schemas.ts:81-89`) e o handler trata
`null` (`src/app/api/alunos/[id]/route.ts:49-56`). **O schema de avaliação não
foi tocado** — tudo que este documento analisa continua valendo.

> Efeito colateral fora do escopo desta mudança, mas registrado: a D3 foi
> resolvida no backend, então a guarda de cliente da E4 que impedia limpar a
> data de nascimento (`MENSAGEM_LIMPAR_DATA`, `features/alunos/acoes.ts`) ficou
> obsoleta e deve ser removida numa passagem futura.

---

## 1. Modelo funcional desejado da interface

**[CLIENTE]** O professor executa as tentativas **fora do sistema**, escolhe o
melhor resultado e digita **apenas esse valor**. O aplicativo deixa de ser um
registrador de séries e passa a ser um registrador de **resultados finais**.

**[CLIENTE]** A avaliação se apresenta em **três blocos**:

```
Avaliação
├── Amplitude   → 4 medidas bilaterais (8 valores), em cm
├── Salto       → 5 valores únicos (CMJ + 4 a nomear)
└── Velocidade  → 2 exercícios, cada um com carga e tempo
```

**[PROPOSTA]** Consequência de interface: **acaba a lista dinâmica**. Não há
"adicionar tentativa", "remover teste", numeração de linha nem verificação de
duplicidade. Todos os campos são **fixos e conhecidos em tempo de compilação**.
O formulário vira um conjunto estável de ~21 campos.

Isso é uma simplificação grande, não uma complicação — ver §8.

---

## 2. Hierarquia final do formulário

**[PROPOSTA]**

```
← Voltar
h1  Nova avaliação
    {nome do aluno} [Badge "Inativo" se aplicável]

[faixa de rascunho, quando houver]
[resumo de erros, role="alert", quando houver]

fieldset  "Data e observações"
   Data da avaliação *            (type=date, padrão hoje em São Paulo)
   Observações                    (textarea, opcional)

fieldset  "Amplitude"
   texto de apoio: em branco ≠ zero
   Mobilidade de tornozelo   [direito] [esquerdo]      cm
   Mobilidade de quadril     [direito] [esquerdo]      cm
   Amplitude de isquiotibiais[direito] [esquerdo]      cm
   SLB                       [direito] [esquerdo]      cm

fieldset  "Salto"
   CMJ                       [valor]                   ⟵ unidade: ver §3
   Salto 2                   [valor]                   ⟵ [BLOQUEIO] unidade
   Salto 3                   [valor]                   ⟵ [BLOQUEIO] unidade
   Salto 4                   [valor]                   ⟵ [BLOQUEIO] unidade
   Salto 5                   [valor]                   ⟵ [BLOQUEIO] unidade

fieldset  "Velocidade"
   Squat Jump                [carga kg] [tempo s]
   Agachamento               [carga kg] [tempo s]

[Salvar avaliação]  [Cancelar]
```

**[PROPOSTA]** Ordem dos blocos igual à ordem que o cliente enunciou
(Amplitude → Salto → Velocidade). Data e observações continuam no topo por
serem o cabeçalho da sessão e por a data ser o único campo obrigatório.

**[PROPOSTA]** O par direito/esquerdo permanece **visualmente agrupado**: é a
razão de a medida ser bilateral (análise de assimetria,
`docs/planilha-atual.md:53`).

---

## 3. Campos, unidades, obrigatoriedade e nullabilidade

### 3.1 Amplitude — sem incerteza

**[CÓDIGO]** As quatro medidas, siglas e a unidade `cm` já existem e estão
corretas em `src/lib/medidas.ts:28-71`.

| Campo | Sigla | Unidade | Obrigatório | Nulo | Zero |
| --- | --- | --- | --- | --- | --- |
| Mobilidade de tornozelo (dir./esq.) | TOR DIR / TOR ESQ | cm | não | sim | sim |
| Mobilidade de quadril (dir./esq.) | QUA DIR / QUA ESQ | cm | não | sim | sim |
| Amplitude de isquiotibiais (dir./esq.) | IQT DIR / IQT ESQ | cm | não | sim | sim |
| SLB (dir./esq.) | SLB DIR / SLB ESQ | cm | não | sim | sim |

**[CÓDIGO]** `SLB` continua sem tradução (`src/lib/medidas.ts:54-55`,
dúvida 12 de `planilha-atual.md`). Não é bloqueio: é rótulo, não estrutura.

### 3.2 Salto — a unidade é um bloqueio real

**[CLIENTE]** Cinco valores: CMJ + quatro ainda sem nome. Usar
`Salto 2`…`Salto 5` provisoriamente.

**[CÓDIGO]** CMJ hoje é `unidade: "cm"` (`src/lib/medidas.ts:64-70`) e é lido
como altura de salto pelo relatório (`app/api/avaliacoes/[id]/relatorio/route.ts:104`).
Para o CMJ, `cm` está confirmado pelo código.

**[BLOQUEIO] Não é possível assumir `cm` para os outros quatro.** A evidência
está em `docs/planilha-atual.md:54`, que lista a bateria de saltos da planilha
real como:

```
CMJ, SJ, EUR, REL %, DJ 30, RSI
```

Dessas, pelo menos três **não são comprimento**:

| Sigla | O que é, na literatura | Unidade provável |
| --- | --- | --- |
| `SJ` | Squat Jump — altura | cm |
| `DJ 30` | Drop Jump de 30 cm — altura | cm |
| `EUR` | *Eccentric Utilization Ratio* — razão CMJ/SJ | **adimensional** |
| `REL %` | percentual relativo | **%** |
| `RSI` | *Reactive Strength Index* — altura ÷ tempo de contato | **adimensional** ou m/s |

**[CÓDIGO] O contrato atual não consegue expressar nada disso.**
`medidaSimples` exige `unidade: z.literal("cm")`
(`src/lib/schemas.ts:14, 26-29`), e o tipo do catálogo fixa `unidade: "cm"` como
tipo literal (`src/lib/medidas.ts:23`). Um valor em `%` ou adimensional é
**impossível de enviar hoje** — não é uma questão de rótulo, é o schema.

**[DÚVIDA]** Os quatro saltos são exatamente `SJ`, `EUR`, `REL %`, `DJ 30`,
`RSI` (que são cinco, não quatro)? Um deles saiu? São outros?

**[DÚVIDA]** `EUR` e `REL %` são **derivados** de CMJ e SJ (EUR = CMJ/SJ). Se
forem, o professor digita ou o sistema calcula? Se calcula, não são campos de
formulário — são saída. **Isto muda a contagem de campos.**

**[PROPOSTA]** Enquanto a resposta não chega, tratar os quatro como
`unidade: string` no contrato v2 (não literal), com o valor real definido no
catálogo por medida. Isso é o mínimo para não travar o backend, e não custa
nada se a resposta vier "tudo cm".

| Campo | Unidade | Obrigatório | Nulo | Zero |
| --- | --- | --- | --- | --- |
| CMJ | cm **[CÓDIGO]** | não | sim | sim, mas ver §7 |
| Salto 2…5 | **[BLOQUEIO]** | não | sim | depende da unidade |

### 3.3 Velocidade

**[CLIENTE]** Dois exercícios: Squat Jump e Agachamento. Cada um tem
**somente carga e tempo**. Sem repetições, sem ordem, sem múltiplas tentativas.

| Campo | Unidade | Obrigatório | Nulo | Zero |
| --- | --- | --- | --- | --- |
| Squat Jump — carga | kg | não* | sim | **[DÚVIDA]** ver §6.3 |
| Squat Jump — tempo | s | não* | sim | não (divisão por zero) |
| Agachamento — carga | kg | não* | sim | **[DÚVIDA]** |
| Agachamento — tempo | s | não* | sim | não |

\* não obrigatório **isoladamente**, mas mutuamente dependente — ver §6.1.

**[DÚVIDA]** O **Squat Jump aparece nos dois blocos**: como salto (`SJ`, altura
em cm) e como exercício de velocidade (carga + tempo). São a mesma medição
entrando duas vezes ou duas coisas diferentes com o mesmo nome? A planilha
sugere que são diferentes — `SJ` está na bateria de saltos (colunas AC–AJ) e
`SJ_1`/`VMP SJ_1` no perfil carga-velocidade (colunas AV+),
`docs/planilha-atual.md:54-55`. **Confirmar com o cliente**, porque muda o
rótulo e evita o professor achar que digitou duas vezes a mesma coisa.

**[DÚVIDA]** O que é `tempo` agora? Sem repetições, presume-se o tempo de **uma
execução**. Confirmar — a fórmula de velocidade depende disso (§12).

---

## 4. Proposta de DTO v2

### 4.1 Princípio de desenho

**[PROPOSTA]** Amplitude e Salto têm exatamente a mesma forma de dado (um
código, uma unidade, um ou dois valores numéricos) e **já cabem na tabela
`Medida` sem nenhuma mudança estrutural** (`prisma/schema.prisma:46-58`). Só a
Velocidade não cabe, porque tem duas grandezas (carga **e** tempo).

Por isso a proposta **não** cria três objetos no DTO espelhando os três blocos
da tela. Ela mantém um único objeto `medidas` (agora com 9 chaves) e troca
`testes[]` por um objeto `velocidade` de chaves fixas. Os três blocos são
**agrupamento de apresentação**, resolvido por um campo `bloco` no catálogo.

Vantagem: `medidasParaLinhas`, `linhasParaMedidas`,
`linhasParaMedidasDetalhadas` e `historicoCmj` (`src/lib/avaliacoes.ts:24-117`,
`relatorio/route.ts:98-114`) **continuam funcionando sem alteração**.

> Alternativa considerada e descartada: espelhar os três blocos no DTO
> (`amplitude` / `saltos` / `velocidade`). Fica mais bonito de ler e mais
> próximo do vocabulário do cliente, mas obriga a reescrever toda a camada de
> conversão medida↔linha por um ganho puramente cosmético. Se o backend
> preferir, é uma troca de forma, não de conteúdo — a decisão é dele (§14).

### 4.2 O DTO

**[PROPOSTA]**

```ts
type CriarAvaliacaoV2 = {
  alunoId: string;              // uuid existente
  dataAvaliacao: string;        // "AAAA-MM-DD"

  // 9 chaves, SEMPRE todas presentes. Bloco definido no catálogo.
  medidas: {
    // --- bloco "amplitude" ---
    mobilidadeTornozelo:    { unidade: "cm"; direito: number | null; esquerdo: number | null };
    mobilidadeQuadril:      { unidade: "cm"; direito: number | null; esquerdo: number | null };
    amplitudeIsquiotibiais: { unidade: "cm"; direito: number | null; esquerdo: number | null };
    slb:                    { unidade: "cm"; direito: number | null; esquerdo: number | null };
    // --- bloco "salto" ---
    cmj:    { unidade: "cm";     valor: number | null };
    salto2: { unidade: string;   valor: number | null };   // [BLOQUEIO] unidade
    salto3: { unidade: string;   valor: number | null };
    salto4: { unidade: string;   valor: number | null };
    salto5: { unidade: string;   valor: number | null };
  };

  // Chaves fixas, SEMPRE ambas presentes. Sem array, sem ordem, sem repetições.
  velocidade: {
    squatJump:   { carga: { valor: number | null; unidade: "kg" };
                   tempo: { valor: number | null; unidade: "s"  } };
    agachamento: { carga: { valor: number | null; unidade: "kg" };
                   tempo: { valor: number | null; unidade: "s"  } };
  };

  observacoes?: string;
};
```

**[PROPOSTA]** Por que `velocidade` é objeto de chaves fixas e não array:

- O cliente fechou o conjunto em dois exercícios. Array reintroduz exatamente
  os problemas que esta mudança elimina (duplicidade de código, ordenação,
  índices em `issues[]`, linhas dinâmicas).
- Chaves fixas mantêm a simetria com `medidas`: **todas as chaves sempre
  presentes, `null` onde não foi medido** — que é a regra já estabelecida e a
  que combate o "zero significando não medido" (`planilha-atual.md:139-141`).
- Acrescentar um terceiro exercício depois é acrescentar uma chave — mesma
  operação que acrescentar uma medida hoje.

**[PROPOSTA]** `nome` do exercício **não vai no DTO**. Vem do catálogo, como
`sigla`/`nome` das medidas. Elimina por construção a divergência código↔nome.

---

## 5. Exemplos JSON

### 5.1 Completo

```jsonc
{
  "alunoId": "8b4dfdff-ba28-4085-a11d-43062d642925",
  "dataAvaliacao": "2026-08-02",
  "medidas": {
    "mobilidadeTornozelo":    { "unidade": "cm", "direito": 11.5, "esquerdo": 12.1 },
    "mobilidadeQuadril":      { "unidade": "cm", "direito": 18.4, "esquerdo": 17.8 },
    "amplitudeIsquiotibiais": { "unidade": "cm", "direito": 21.0, "esquerdo": 20.7 },
    "slb":                    { "unidade": "cm", "direito": 32.5, "esquerdo": 31.9 },
    "cmj":    { "unidade": "cm", "valor": 42.8 },
    "salto2": { "unidade": "cm", "valor": 38.1 },
    "salto3": { "unidade": "cm", "valor": 35.0 },
    "salto4": { "unidade": "cm", "valor": 30.2 },
    "salto5": { "unidade": "cm", "valor": 28.9 }
  },
  "velocidade": {
    "squatJump":   { "carga": { "valor": 20, "unidade": "kg" },
                     "tempo": { "valor": 1.43, "unidade": "s" } },
    "agachamento": { "carga": { "valor": 60, "unidade": "kg" },
                     "tempo": { "valor": 1.91, "unidade": "s" } }
  },
  "observacoes": "Boa evolução na mobilidade."
}
```

> As unidades de `salto2`…`salto5` estão como `"cm"` **apenas para o exemplo
> ficar legível**. São exatamente o que o §3.2 marca como bloqueio.

### 5.2 Parcial — só amplitude

**[CLIENTE]/[CÓDIGO]** Avaliação parcial é a norma
(`docs/planilha-atual.md:143-144`). Todas as chaves continuam presentes:

```jsonc
{
  "alunoId": "8b4dfdff-ba28-4085-a11d-43062d642925",
  "dataAvaliacao": "2026-08-02",
  "medidas": {
    "mobilidadeTornozelo":    { "unidade": "cm", "direito": 11.5, "esquerdo": 12.1 },
    "mobilidadeQuadril":      { "unidade": "cm", "direito": null, "esquerdo": null },
    "amplitudeIsquiotibiais": { "unidade": "cm", "direito": null, "esquerdo": null },
    "slb":                    { "unidade": "cm", "direito": null, "esquerdo": null },
    "cmj":    { "unidade": "cm", "valor": null },
    "salto2": { "unidade": "cm", "valor": null },
    "salto3": { "unidade": "cm", "valor": null },
    "salto4": { "unidade": "cm", "valor": null },
    "salto5": { "unidade": "cm", "valor": null }
  },
  "velocidade": {
    "squatJump":   { "carga": { "valor": null, "unidade": "kg" },
                     "tempo": { "valor": null, "unidade": "s"  } },
    "agachamento": { "carga": { "valor": null, "unidade": "kg" },
                     "tempo": { "valor": null, "unidade": "s"  } }
  }
}
```

### 5.3 Parcial — só um exercício de velocidade

```jsonc
{
  "velocidade": {
    "squatJump":   { "carga": { "valor": 20, "unidade": "kg" },
                     "tempo": { "valor": 1.43, "unidade": "s" } },
    "agachamento": { "carga": { "valor": null, "unidade": "kg" },
                     "tempo": { "valor": null, "unidade": "s"  } }
  }
}
```

**[CÓDIGO]** Consequência: um único ponto de carga. `ajustarCurva` devolve
`null` com menos de 2 pontos (`src/lib/calculos.ts:80`). Ver §12.

### 5.4 Inválido — carga sem tempo

```jsonc
{
  "velocidade": {
    "squatJump": { "carga": { "valor": 20,   "unidade": "kg" },
                   "tempo": { "valor": null, "unidade": "s"  } }
  }
}
```

**[PROPOSTA]** Deve ser rejeitado — ver §6.1.

---

## 6. Regras de consistência

### 6.1 Carga e tempo são mutuamente dependentes

**[PROPOSTA]** Para cada exercício de velocidade: **ou os dois valores estão
preenchidos, ou os dois são `null`.**

Justificativa: uma carga sem tempo não produz velocidade e não tem posição na
curva; um tempo sem carga não tem abscissa. Meio par é dado inutilizável que
mente sobre estar completo.

**[PROPOSTA]** Isso não é expressável por tipo — exige um `superRefine` no
backend, com `issues[].field` apontando para o campo faltante, para o front
conseguir marcar o campo certo:

```
velocidade.squatJump.tempo.valor  ·  "Informe o tempo junto com a carga."
```

**[PROPOSTA]** O cliente valida a mesma regra antes de enviar, para não gastar
requisição — mas o servidor continua sendo a autoridade.

### 6.2 Zero em tempo

**[PROPOSTA]** `tempo.valor` **nunca** pode ser `0` — velocidade seria divisão
por zero. Manter `> 0`.

### 6.3 Zero em carga — decisão pendente

**[CÓDIGO]** Hoje `carga.valor` é `z.number().positive()`
(`src/lib/schemas.ts:48`), ou seja **`0` é rejeitado**.

**[DÚVIDA]** No modelo novo isso pode estar errado. Um **Squat Jump sem carga
externa (peso corporal)** é uma medição legítima e provavelmente comum — e é
exatamente `carga = 0 kg`. Sob o modelo antigo (séries com carga) o zero era
estranho; sob o modelo novo (melhor resultado único) parece necessário.

**[PROPOSTA]** Se o cliente confirmar que peso corporal é registrado, mudar
para `min(0)` e tratar `0` como carga real. Impacto direto na curva: o ponto
`(0, v)` é justamente o intercepto V0 medido, o que **melhora** o ajuste.

### 6.4 Unicidade

**[PROPOSTA]** Deixa de existir como regra. Com chaves fixas em `medidas` e
`velocidade`, duplicidade é sintaticamente impossível. Todo o aparato de
detecção de código duplicado e o `409` desaparecem do domínio.

---

## 7. `null` versus `zero`

**[CLIENTE]/[CÓDIGO]** A regra não muda e continua sendo o ponto mais
sensível do produto: `docs/planilha-atual.md:139-141` documenta "zero
significando não medido" como defeito herdado da planilha, com uma avaliação
real de 21/09/2023 tendo `CMJ = 0` e `SJ = 0`.

| Situação | Valor no JSON | Significado |
| --- | --- | --- |
| Campo em branco | **`null`** | não medido |
| Campo com `0` | **`0`** | medido, resultado zero |
| Campo em branco | ~~`0`~~ | **proibido** |
| Campo em branco | ~~`""`~~ | **proibido** |
| Campo em branco | ~~ausente~~ | **proibido** (chave sempre presente) |

**[PROPOSTA]** Mantidas as garantias já desenhadas na E5: parser devolve `null`
para string vazia, nunca `Number("")` (que devolve `0`); mapper emite as chaves
todas; texto de apoio no formulário explicita "em branco é diferente de zero".

**[DÚVIDA]** Para os saltos: `0` é fisicamente plausível em alguma das cinco
medidas? Para altura de salto, um `0` real é implausível e quase certamente é o
bug herdado. Para um índice como `RSI`, `0` pode ser legítimo. A resposta muda
se vale a pena avisar o professor ao digitar `0` num campo de salto.

---

## 8. Impacto sobre o formulário atual da E5

**[CÓDIGO]** A E5 está em `feat/evaluation-form` (`87e7336`), **não mergeada**.
Arquivos afetados, todos em `src/features/avaliacoes/`:

| Arquivo | Destino | Motivo |
| --- | --- | --- |
| `TentativaItem.tsx` | **apagar** | não existem tentativas |
| `TesteItem.tsx` | **apagar** | não existem testes com lista |
| `TestesFieldset.tsx` | **apagar** | não existe lista dinâmica |
| `catalogo.ts` | **reescrever** | vira catálogo de exercícios de velocidade, sem `rotulo` de seleção |
| `tipos.ts` | **reescrever** | `LinhaTeste` deixa de existir; `ValoresAvaliacao.testes` vira `velocidade` |
| `mappers.ts` | **reescrever** | some o laço de testes e a derivação de `ordem`; entram 4 saltos e o bloco de velocidade |
| `acoes.ts` | **simplificar** | some a detecção de duplicidade e o tratamento de `409` |
| `AvaliacaoForm.tsx` | **simplificar muito** | somem `linhas`, `estruturaCorresponde`, os 5 handlers de linha, os anúncios `aria-live` de linha |
| `rascunho.ts` | **ajustar** | some `linhasDoRascunho`; **subir `VERSAO_RASCUNHO` para 2** |
| `MedidasFieldset.tsx` | **dividir** | vira `AmplitudeFieldset` + `SaltosFieldset` |
| `decimal.ts` | **quase intacto** | `paraInteiro` fica sem uso (era só para repetições) |
| `nova/page.tsx`, `nova/loading.tsx` | ajuste pequeno | esqueleto muda de forma |

**[PROPOSTA]** Saldo: a E5 **encolhe**. A parte de maior risco técnico do
frontend (lista dinâmica, índices em `issues[]` aninhados, preservação de valor
ao remover linha, duplicidade, `ordem` derivada) **deixa de existir**. O que
sobra é um formulário de campos fixos — a mesma classe de problema da E4, que
já está resolvida e mergeada.

**[PROPOSTA]** O rascunho não precisa de código de migração: `lerRascunho` já
descarta rascunho de versão diferente (`rascunho.ts`, ramo
`versao !== VERSAO_RASCUNHO`). Subir para `2` basta.

---

## 9. Impacto no resto do sistema

### 9.1 Ficha do aluno

**[CÓDIGO]** `src/features/alunos/TestesAvaliacao.tsx:43-56` renderiza uma
tabela com colunas **Ordem · Repetições · Carga · Tempo**. Duas dessas colunas
deixam de existir. **Reescrever**: vira uma tabela de dois exercícios com carga
e tempo, ou some e é absorvida pelo bloco de velocidade.

### 9.2 Histórico

**[CÓDIGO]** `colunasDeMedida()` (`src/features/alunos/utils.ts:73-95`) deriva
as colunas do catálogo: hoje **9**. Com 4 saltos novos vira **13**, mais a
coluna de data = **14 colunas**.

**[PROPOSTA]** 14 colunas não cabem confortavelmente num tablet nem em A4
retrato. Decidir entre: (a) uma tabela por bloco (Amplitude / Salto), (b) manter
uma tabela larga com rolagem horizontal em tela e quebra em impressão, (c)
escolher um subconjunto para o histórico. **Decisão de produto**, não técnica.

### 9.3 Detalhe futuro da avaliação (E6)

**[PROPOSTA]** Ainda não existe — é entregável da E6. Nasce já no modelo v2,
portanto **não há retrabalho**, desde que a E6 só comece depois do contrato
final. É mais um argumento para congelar o frontend até o backend responder.

### 9.4 Relatório

**[CÓDIGO]** É onde o dano é maior. `app/api/avaliacoes/[id]/relatorio/route.ts:39-52`
monta a curva com **um ponto por tentativa**, somando todas as tentativas de
todos os testes. Hoje o seed gera 2+3 = **5 pontos**; a planilha real tem
**8** (`planilha-atual.md:35-41`).

**[CÓDIGO]** No modelo v2 sobram **no máximo 2 pontos** (um por exercício).
Consequências verificadas no código:

- `ajustarCurva` devolve `null` com menos de 2 pontos (`calculos.ts:80`) → com
  só um exercício preenchido, **não há curva**.
- Com as duas cargas iguais, `sxx === 0` → devolve `null` (`calculos.ts:97`).
- Com exatamente 2 pontos distintos, a reta passa exatamente por ambos, então
  `ssRes = 0` e **`r2` é sempre `1`** (`calculos.ts:102-109`). O "índice de
  qualidade da curva" vira uma constante — **deixa de ser informação**.
- `classificarPerfil` e `calcularScore` derivam do ajuste
  (`calculos.ts:125-151`) → passam a ser função de duas medições.

**[BLOQUEIO]** As seções 2, 3, 4, 7 e 10 do relatório
(`planilha-atual.md:76-93` — curva atual, evolução da curva, análise técnica,
métricas principais, score) foram desenhadas sobre uma curva de 8 pontos. Com 2
pontos elas não se sustentam. **O cliente precisa dizer o que quer**: manter a
curva assim mesmo, reduzi-la a uma comparação de dois pontos, ou remover as
seções do MVP. Não dá para decidir isso do lado técnico.

### 9.5 Impressão

**[CÓDIGO]** O CSS de impressão da E3 (`src/app/globals.css`) foi ajustado
contra as alturas de seção atuais — o comentário em `globals.css:66` cita
"1026px de altura útil do A4, então todas cabem inteiras".

**[PROPOSTA]** As seções mudam de tamanho: a tabela de medidas ganha 4 linhas,
a da curva encolhe para ≤2. Não é bloqueio, mas **exige uma revalidação das
quebras de página** ao final da refatoração. Trabalho pequeno, previsível.

### 9.6 Rascunho local

Ver §8: basta subir `VERSAO_RASCUNHO` para `2`. O descarte de versão antiga já
está implementado.

### 9.7 Seed

**[CÓDIGO]** `prisma/seed.ts:60-98` gera 4 medidas bilaterais + CMJ e dois
testes com 2 e 3 tentativas. **Precisa ser regenerado**: acrescentar os 4
saltos e trocar tentativas por um par carga/tempo por exercício. Tarefa do
backend.

---

## 10. Incompatibilidades com o contrato atual

**[CÓDIGO]** Lista exaustiva do que impede o modelo v2 hoje:

| # | Onde | O que impede |
| --- | --- | --- |
| 1 | `schemas.ts:14, 26-29` | `medidaSimples.unidade` é `z.literal("cm")` — **impossível** enviar `%` ou adimensional |
| 2 | `medidas.ts:23` | `DefinicaoMedida.unidade` é o tipo literal `"cm"` |
| 3 | `schemas.ts:51` | `tentativa.ordem` obrigatório, inteiro ≥ 1 |
| 4 | `schemas.ts:52` | `tentativa.repeticoes` obrigatório, inteiro 1–100 |
| 5 | `schemas.ts:60` | `testeSchema.tentativas` tem `.min(1)` — obriga ao menos um objeto tentativa |
| 6 | `schemas.ts:48` | `carga.valor` é `positive()` — bloqueia peso corporal (§6.3) |
| 7 | `schema.prisma:80-81` | `Tentativa.ordem` e `Tentativa.repeticoes` são `NOT NULL` |
| 8 | `schema.prisma:89` | `@@unique([testeId, ordem])` pressupõe múltiplas tentativas |
| 9 | `schema.prisma:66` | `Teste.ordem` obrigatório |
| 10 | `calculos.ts:38-45` | `velocidadeMedia` **exige** `repeticoes` |
| 11 | `avaliacoes.ts:164-173` | `serializarAvaliacao` emite `tentativas[]` com `ordem`/`repeticoes` |

**[PROPOSTA]** O item 11 tem efeito em cascata **desejável**: o tipo do front
`AvaliacaoCompleta` é derivado por `ReturnType<typeof serializarAvaliacao>`
(`src/features/alunos/tipos.ts:35`). Quando o backend mudar a serialização, o
`npm run typecheck` do frontend **quebra em todos os pontos afetados** — que é
exatamente a mitigação do risco R3 do `frontend-plan.md` funcionando como
projetado. Não tentar contornar.

**[PROPOSTA]** Explicitamente **não** propomos preservar o contrato atual. Usar
`ordem: 1` e `repeticoes: 1` como valores fixos faria o contrato mentir: diria
"uma série de uma repetição" onde o domínio diz "melhor resultado, sem noção de
série". Dado artificial em campo obrigatório é exatamente o defeito que o
produto existe para eliminar.

---

## 11. Impacto provável em Prisma e API

> **Nada disto foi alterado.** É levantamento para o desenvolvedor do backend.

### 11.1 `Medida` — muda pouco

**[CÓDIGO]** `prisma/schema.prisma:46-58` já é genérica: `codigo String`,
`unidade String` (texto livre no banco), `direito`/`esquerdo`/`valor` todos
`Float?`, com `@@unique([avaliacaoId, codigo])`.

**[PROPOSTA]** Os 4 saltos novos entram como 4 linhas novas, com códigos novos.
**Nenhuma migração estrutural.** A restrição de unidade é do Zod e do catálogo
TypeScript, não do banco.

### 11.2 `Teste` + `Tentativa` — mudança estrutural

**[PROPOSTA]** Duas tabelas para guardar um par `(carga, tempo)` por exercício
é sobre-modelagem depois desta mudança. Opções:

| Opção | Descrição | Avaliação |
| --- | --- | --- |
| **A** | Nova tabela `MedidaVelocidade { avaliacaoId, codigo, cargaValor, cargaUnidade, tempoValor, tempoUnidade }` com `@@unique([avaliacaoId, codigo])`; remover `Teste` e `Tentativa` | **Recomendada.** Espelha `Medida`, uma linha por exercício, sem coluna órfã |
| B | Manter `Teste`, mover carga/tempo para colunas dele, remover `Tentativa` | Funciona; mantém o nome "Teste", que ficou ambíguo (§3.3) |
| C | Manter as duas tabelas, gravar exatamente uma `Tentativa` com `ordem: 1`, `repeticoes: 1` | **Rejeitada.** Dado artificial em coluna obrigatória; contraria o domínio |

### 11.3 API

**[PROPOSTA]** `POST /avaliacoes` e `GET /avaliacoes/:id` mudam de formato
(`testes[]` → `velocidade`). **É breaking change deliberado**, sem versionamento
paralelo: não há cliente em produção (§13).

**[PROPOSTA]** O `409` genérico por `@@unique` deixa de ser alcançável no fluxo
de avaliação (§6.4). O tratamento pode sair do frontend.

---

## 12. Impacto sobre cálculos e curva carga-velocidade

**[CÓDIGO]** `velocidadeMedia({ codigo, repeticoes, tempoSegundos })` calcula
`repeticoes × deslocamento(codigo) / tempo` (`calculos.ts:38-45`). Sem
`repeticoes`, **a função não compila**.

**[PROPOSTA]** A adaptação direta é `deslocamento / tempo`, assumindo que o
tempo agora se refere a **uma execução**. Mas isso depende de a resposta de
§3.3 confirmar o que é `tempo`. **Não estamos propondo fórmula nova** — apenas
apontando que a existente perde um termo.

**[CÓDIGO]** `deslocamentoDoExercicio` continua um chute de 0,5 m para todos os
códigos (`calculos.ts:19-28`), com a dúvida 11 de `planilha-atual.md:183-187`
ainda aberta. **Esta mudança não resolve nem piora isso.**

**[CÓDIGO]/[BLOQUEIO]** O impacto real está no número de pontos, já detalhado em
§9.4: de 5–8 pontos para **no máximo 2**, com `r2` degenerando para `1` sempre.

**[DÚVIDA]** Há uma contradição de fundo a resolver com o cliente: `docs/vbt.md`
registra que o professor usa **VMP** (velocidade média propulsiva) medida por
encoder, e a planilha tem colunas `VMP_1..7`. O aplicativo pede **tempo**, e
deriva velocidade com um deslocamento chutado. Se o professor tem o encoder e
já possui a VMP, **por que o app não recebe a velocidade diretamente?** Um
campo `velocidade (m/s)` em vez de `tempo (s)` eliminaria de uma vez a dúvida
11, o chute de deslocamento e toda a derivação. Isto pode ser a pergunta mais
valiosa desta rodada.

---

## 13. Dados antigos: migrar ou não

**[CÓDIGO]** O banco contém **apenas os 3 alunos fictícios do seed** (Ana Prado
8 avaliações, Bruno Tavares 5, Carla Menezes 3 — 16 avaliações no total).

**[CÓDIGO]** A importação da planilha de 3 anos **nunca aconteceu** — está
listada como dúvida 10 em `planilha-atual.md:181-182`, ainda em aberto.

**[PROPOSTA]** Portanto **não existe dado real a migrar**, e a questão de
migração praticamente desaparece:

- **Amplitude e CMJ**: preservados sem esforço (mesma tabela `Medida`).
- **Tentativas existentes**: não há como escolher automaticamente "a melhor"
  — a escolha é do professor, feita fora do sistema, e inventar um critério
  (maior carga? menor tempo?) seria fabricar dado.
- **Recomendação**: **descartar** as tentativas do seed e **regerar o seed** no
  formato v2. É dado fictício; recriá-lo custa menos que migrá-lo e não
  arrisca inventar semântica.

**[DÚVIDA]** Se a importação da planilha entrar no escopo depois, aí sim haverá
um problema real de mapeamento: a planilha tem `CARGA_1..7`/`VMP_1..7` (vários
pontos), e o modelo v2 guarda um. **Confirmar com o cliente se o histórico
antigo entra e, se entrar, o que fazer com os pontos extras.**

---

## 14. Decisões obrigatórias do backend

1. Aceitar ou recusar a forma do DTO v2 (§4) — `medidas` de 9 chaves +
   `velocidade` de chaves fixas, ou três objetos espelhando os blocos.
2. Como representar unidade não-`cm` nos saltos: `z.string()`, união fechada
   (`z.enum(["cm","%","ms","adimensional"])`) ou literal por medida.
3. Qual opção de tabela para velocidade (§11.2) — A, B ou outra.
4. `carga.valor` passa a aceitar `0` (peso corporal)? (§6.3)
5. Onde validar a dependência mútua carga↔tempo e qual `field` sai em
   `issues[]` (§6.1).
6. Os 4 códigos novos de salto (`codigo` persistido, sigla, nome, unidade,
   bloco).
7. Acrescentar `bloco: "amplitude" | "salto"` ao catálogo de medidas.
8. Nova assinatura de `velocidadeMedia` sem `repeticoes` (§12).
9. O que a API devolve quando a curva tem menos de 2 pontos — hoje `ajuste:
   null` e as seções ficam vazias.
10. Regerar `prisma/seed.ts` no formato v2.
11. Confirmar que `GET /avaliacoes/:id` e `/relatorio` mudam junto, e que o
    `409` sai do fluxo.
12. Manter o check de sincronia catálogo↔schema (`schemas.ts:120-127`)
    funcionando com as 9 chaves.

---

## 15. Decisões obrigatórias do cliente

1. **Nome definitivo dos 4 saltos.**
2. **Unidade de cada um dos 4 saltos.** — **[BLOQUEIO]**, ver §3.2.
3. Algum dos 4 é **derivado** (EUR = CMJ/SJ, REL %)? Se sim, o professor digita
   ou o sistema calcula?
4. O **Squat Jump** do bloco Velocidade é a mesma coisa que o `SJ` do bloco
   Salto? (§3.3)
5. O que é **`tempo`** agora, sem repetições? Tempo de uma execução?
6. O professor **tem a velocidade (VMP) do encoder**? Se tem, faz mais sentido
   o app receber velocidade em vez de tempo? (§12)
7. **Peso corporal (carga 0 kg)** é registrado? (§6.3)
8. Com no máximo 2 pontos de carga, **a curva força-velocidade continua no
   produto**? O que fazer com as seções do relatório que dependem dela? (§9.4)
   — **[BLOQUEIO]**
9. O histórico com **14 colunas** deve virar tabelas por bloco? (§9.2)
10. `0` é resultado plausível em algum campo de salto? (§7)
11. A importação dos 3 anos de planilha entra no escopo? (§13)

---

## 16. Riscos de implementar o frontend antes do contrato final

| Risco | Severidade | Por quê |
| --- | --- | --- |
| Unidade dos saltos errada | **alta** | Muda validação, formatação, rótulo, e o relatório inteiro do bloco Salto. Retrabalho do bloco completo |
| Paths de `issues[]` diferentes do previsto | **alta** | O mecanismo central da E5 é `name` do input **idêntico** ao path do Zod. Errar o path quebra o mapeamento de erro, o foco no primeiro erro e o resumo — o núcleo do formulário |
| Forma do DTO diferente | **alta** | `mappers.ts`, `acoes.ts`, `tipos.ts` e a versão do rascunho são todos derivados dela |
| `carga: 0` permitido ou não | média | Muda validação e mensagem em dois campos |
| Curva removida do produto | média | Se as seções do relatório saírem, parte do trabalho da E2/E3 vira código morto |
| Nomes definitivos dos saltos | baixa | Só rótulo; trocar texto é barato |

**[PROPOSTA]** O custo de esperar é **baixo agora e cresce depois**: a E5 não
está mergeada, então hoje se descarta uma branch. Se o formulário v2 for
construído sobre um contrato adivinhado, descarta-se a v2 também.

---

## 17. Sequência recomendada

```
1. Aprovação do produto      → cliente responde §15 (bloqueios 2 e 8 primeiro)
2. Revisão do backend        → backend responde §18 com o §14 em mãos
3. Contrato final            → DTO v2 escrito e versionado em docs/api.md
4. Backend                   → Prisma, schemas, rotas, cálculos, seed
5. Frontend                  → refatoração da E5 (§19)
6. Testes                    → API, formulário, relatório, impressão, rascunho
```

**[PROPOSTA]** Nada do passo 5 começa antes de o passo 3 estar escrito. Os dois
bloqueios (unidade dos saltos, futuro da curva) precisam de resposta antes do
passo 2 — sem eles o backend também não consegue decidir.

**[PROPOSTA]** A branch `feat/evaluation-form` (E5 v1) **não deve ser
mergeada**. Mantê-la como referência histórica; o parser decimal, o tratamento
de `null`/zero, o padrão de `useActionState`, o rascunho e o mapeamento de 422
são reaproveitáveis quase sem mudança.

---

## 18. Checklist para o desenvolvedor do backend

Responder item a item. Cada resposta destrava um pedaço do frontend.

**Contrato**
- [ ] O DTO v2 do §4 está aceito? Se não, qual a forma final?
- [ ] `medidas` continua sendo um objeto único de 9 chaves, ou vira
      `amplitude` + `saltos`?
- [ ] `velocidade` é objeto de chaves fixas (proposto) ou array?
- [ ] Todas as chaves continuam **sempre presentes**, com `null` no não medido?

**Unidades**
- [ ] Como o schema passa a expressar unidade não-`cm`?
- [ ] Qual a unidade final de cada um dos 4 saltos?
- [ ] `unidade` continua vindo no payload ou passa a ser só do catálogo?

**Velocidade**
- [ ] Qual opção de tabela (§11.2 A/B/outra)?
- [ ] `carga.valor` aceita `0`?
- [ ] Onde é validada a dependência carga↔tempo e qual `field` sai no `issues[]`?
- [ ] `tempo` continua em segundos, ou passa a ser velocidade em m/s (§12)?

**Erros**
- [ ] Lista dos `issues[].field` possíveis no v2 — **o frontend precisa dela
      literal**, porque os `name` dos inputs são iguais aos paths.
- [ ] O `409` sai do fluxo de avaliação?

**Cálculo e relatório**
- [ ] Nova assinatura de `velocidadeMedia`.
- [ ] O que a API devolve em `curva`/`ajuste`/`score` com ≤2 pontos?
- [ ] As seções do relatório dependentes da curva continuam?

**Dados**
- [ ] `prisma/seed.ts` será regerado no v2?
- [ ] As tentativas atuais são descartadas (proposto) ou migradas?
- [ ] Os 4 códigos novos de salto, com sigla e nome.

**Resposta**
- [ ] `GET /avaliacoes/:id` e `/relatorio` mudam junto com o `POST`?
- [ ] `serializarAvaliacao` passa a emitir o quê, exatamente?

---

## 19. Plano de refatoração da E5 (depois da resposta do backend)

**[PROPOSTA]** Só executar com o §18 respondido e o contrato em `docs/api.md`.

**U1 — Contrato e lógica pura**
Reescrever `tipos.ts`, `catalogo.ts` (medidas com `bloco` + exercícios de
velocidade), `mappers.ts` (9 medidas + bloco de velocidade, sem laço de
testes), `acoes.ts` (sem duplicidade, sem 409). `decimal.ts` praticamente
intacto; remover `paraInteiro` se ficar sem uso.
Validação: `typecheck`, `lint`, `build` e testes unitários do mapper contra os
exemplos do §5.

**U2 — Blocos de Amplitude e Salto**
`AmplitudeFieldset` + `SaltosFieldset` a partir do catálogo, com o texto de
"em branco ≠ zero" e a referência da última avaliação.
Validação: `null` vs `0` ponta a ponta; vírgula e ponto; 422 por campo.

**U3 — Bloco de Velocidade**
Quatro campos fixos, com a regra de consistência carga↔tempo no cliente.
Validação: par incompleto barrado antes do envio; `field` do 422 correto.

**U4 — Rascunho v2 e submit**
`VERSAO_RASCUNHO = 2`; remover `linhasDoRascunho`; conferir que rascunho v1 é
descartado sozinho.
Validação: restaurar/descartar; limpo no sucesso, mantido no erro.

**U5 — Ficha, histórico, relatório e impressão**
Reescrever `TestesAvaliacao.tsx`; decidir a apresentação do histórico de 14
colunas (§9.2); revalidar as quebras de página da impressão (§9.5).
Validação: 360/768/1280 px, zoom 200 %, teclado, seed limpo ao final.

**[PROPOSTA]** Estimativa relativa: **menor que a E5 original**. Somem as três
partes mais caras (lista dinâmica, índices aninhados em `issues[]`, prevenção
de duplicidade); entram quatro campos simples e uma regra de consistência de
duas linhas.

---

## 20. Resumo dos bloqueios

| # | Bloqueio | Quem responde | Trava o quê |
| --- | --- | --- | --- |
| B1 | Unidade dos 4 saltos — o schema atual só aceita `cm` | cliente → backend | Schema, catálogo, formulário, relatório do bloco Salto |
| B2 | Com ≤2 pontos, a curva força-velocidade ainda existe? | cliente | Seções 2, 3, 4, 7 e 10 do relatório |
| B3 | Contrato v2 final não escrito | backend | Todo o frontend da avaliação |

**[CÓDIGO]** Segue aberto e **não é** desta mudança: a hipótese Samozino
(massa corporal, altura de salto, distância de push-off) continua sem nenhum
campo no schema, e a dúvida 11 (amplitude do movimento) segue chutada em 0,5 m.

# E5 v2 — Formulário de avaliação (contrato definido pelo frontend)

> Especificação operacional. **Não é o contrato final do backend** — é o contrato
> **desejado pelo frontend**, autorizado pelo backend a servir de ponto de
> partida (`docs/evaluation-model-v2-proposal.md` §17, decisão do cliente
> registrada em 05/08/2026). O backend revisará este commit e adaptará Prisma,
> schemas e `docs/api.md` depois.
>
> **Convenção de marcação**, herdada de `evaluation-model-v2-proposal.md`:
>
> | Marca | Significado |
> | --- | --- |
> | **[FRONTEND-DEFINIDO]** | Decisão fechada nesta spec, de propriedade do frontend |
> | **[REUTILIZADO-V1]** | Padrão ou trecho trazido de `feat/evaluation-form`, arquitetura inalterada |
> | **[PENDENTE-BACKEND]** | Só se completa quando o backend publicar o contrato em `docs/api.md` |
> | **[A VERIFICAR NA IMPLEMENTAÇÃO]** | Dedução sobre comportamento do Zod/React não medida contra servidor real — precisa de teste unitário que a confirme |

---

## 1. Resumo

### 1.1 Objetivo

Entregar `/alunos/[id]/avaliacoes/nova` **hoje**, com o modelo de domínio v2
completo — três blocos fixos, sem tentativas, sem repetição, sem ordem — mesmo
que `POST /api/avaliacoes` ainda só aceite o contrato v1. A gravação real fica
pendente; tudo o resto — formulário, validação, rascunho, acessibilidade — fica
pronto.

### 1.2 Por que agora, antes do backend

O backend autorizou o frontend a definir o contrato v2 e revisará o resultado
antes de adaptar Prisma, schemas e API (mensagem do usuário, 05/08/2026).
Esperar o backend terminar primeiro jogaria fora a vantagem de já termos: (a) o
modelo de domínio fechado pelo cliente (`evaluation-model-v2-proposal.md` §1-§3),
(b) um catálogo grande de padrões reaproveitáveis da E5 v1 (§16), e (c) uma
arquitetura de formulário (FormData não-controlado + `useActionState`) que não
muda com o formato do payload.

### 1.3 Escopo

Rota nova · três `fieldset` fixos (Amplitude, Salto, Velocidade) · parser
decimal pt-BR · `null` versus zero · regra de consistência carga↔tempo ·
referência somente-leitura da última avaliação **onde o dado já existe hoje** ·
rascunho `localStorage` versão 2 · mapeamento de erro por campo · foco no
primeiro erro · guarda contra duplo submit · **porta de integração isolada**,
hoje devolvendo um estado explícito de "backend v2 indisponível" · testes
automatizados (`vitest`) para tudo que não depende de rede.

### 1.4 Fora de escopo

**Chamar de verdade `POST /api/avaliacoes` com o payload v2** — o endpoint
ainda é v1 e não deve ser alimentado com um DTO que não entende (§13) ·
detalhe de avaliação (E6) · edição de avaliação · qualquer alteração de
`prisma/**`, `src/app/api/**`, `src/lib/**`, `prisma/seed.ts` ou `docs/api.md` ·
instalar dependência nova · criação de aluno inline · fórmulas do relatório ·
polimento visual definitivo (E8) · resolver globalmente os tokens da Nova.

### 1.5 O que esta etapa NÃO pode fazer, por desenho

Como `enviarAvaliacaoV2` (§13) nunca chama `fetch` na versão entregue aqui,
**esta etapa é estruturalmente incapaz de gravar ou corromper qualquer
avaliação real no banco**. Isso muda a disciplina de teste em relação à E5 v1:
não há necessidade de criar e apagar avaliações `ZZTESTE-*`, porque nenhuma
avaliação é criada por este formulário enquanto o backend for v1. Ainda é
necessário um aluno de teste (`ZZTESTE-E5V2-*`, criado pela UI já existente de
`/alunos/novo`) para exercitar a leitura da referência (§9) e a rota da
página — mas ele nunca ganha uma avaliação nova por este fluxo.

### 1.6 A rota existe; o ponto de entrada na ficha, ainda não

**[FRONTEND-DEFINIDO], revisado após aprovação do usuário (05/08/2026).**
`/alunos/[id]/avaliacoes/nova` **é criada e é navegável por URL direta** — é o
que permite revisar e testar esta etapa. Mas **`src/app/alunos/[id]/page.tsx`
não ganha nenhum link ou botão "Nova avaliação" nesta etapa.** Enquanto o
backend for v1, expor um ponto de entrada na ficha apresentaria ao professor
uma funcionalidade que parece pronta e não é — o risco que a etapa existe
justamente para evitar (§18).

Isso substitui a decisão anterior desta spec (que copiava o ponto de entrada
da E5 v1). A alternativa oferecida — manter o link, mas com aviso persistente
— foi avaliada e descartada em favor da mais conservadora: **nenhum link**,
porque remove por completo a chance de alguém chegar à tela sem querer.

**Mesmo assim, a página carrega um aviso estrutural persistente** (§17.1),
porque a rota continua acessível por URL direta durante o desenvolvimento e a
revisão, e ninguém que a abrir — por engano ou de propósito — deve poder
confundi-la com um formulário que salva. O aviso não é uma alternativa ao link
ausente; é uma segunda camada de proteção, independente da primeira.

Quando o backend publicar o contrato v2 e `enviarAvaliacaoV2` passar a
gravar de verdade (§13.2), **duas coisas acontecem juntas, no mesmo commit**:
o link entra na ficha, e o aviso persistente sai da página. Nenhuma das duas
sozinha faz sentido.

---

## 2. Estado atual

### 2.1 Branch e ponto de partida

`feat/evaluation-form-v2`, criada de `main` **depois** do merge de
`refactor/evaluation-model` (commit `09931db`, que trouxe `frontend-plan.md`
atualizado e `evaluation-model-v2-proposal.md`). Working tree limpo.
`src/features/avaliacoes/**` **não existe** nesta branch — a E5 v1
(`feat/evaluation-form`, commit `87e7336`) nunca foi mergeada e permanece
**referência histórica apenas** (§16). Nenhum arquivo dela é copiado ou
importado.

### 2.2 O que já existe e pode ser reutilizado sem mudança

| Recurso | Caminho | Uso aqui |
| --- | --- | --- |
| `useActionState` + ação de cliente | padrão de `src/features/alunos/acoes.ts` | modelo a repetir |
| `apiFetch` / `ResultadoApi` / `mensagemDoErro` | `src/features/shared/api.ts`, `erros.ts` | usados **só dentro** de `enviarAvaliacaoV2`, e só quando o backend v2 existir (§13) |
| `origemAtual()` | `src/features/shared/origem.ts` | Server Component da rota |
| `CampoFormulario` | `src/components/ui/campo-formulario.tsx` | reuso direto nos três fieldsets |
| `Button`, `buttonVariants` | `src/components/ui/button.tsx` | reuso direto |
| `Badge`, `Skeleton` | `src/components/ui/**` | reuso direto |
| Catálogo de medidas (parcial) | `src/lib/medidas.ts` | fonte de sigla/rótulo dos 4 campos de amplitude + CMJ (§9) |
| `AlunoDetalhe`, `AvaliacaoCompleta` | `src/features/alunos/tipos.ts` | tipos de leitura, inalterados |

### 2.3 O que não existe ainda e esta spec cria

Todo `src/features/avaliacoes/**`, a rota
`src/app/alunos/[id]/avaliacoes/nova/**`, e `hojeIsoSaoPaulo()` em
`src/features/shared/formato.ts` (existia na E5 v1, mas nunca chegou à `main`).

### 2.4 Limitações herdadas, ainda válidas

- **Tokens Nova ausentes** — mesma regra da E5 v1 (`e5-implementation-spec.md`
  §2.4): erro nunca só por cor, `text-destructive` não pinta nada.
- **`vitest.config.mts`** roda só `src/**/*.test.ts` em `environment: "node"`,
  **sem** `jsdom`/React Testing Library. Isso decide o alcance de §19: lógica
  pura é testável por `vitest` hoje; renderização, foco e re-render são
  verificados manualmente no navegador, como já era na E5 v1.

---

## 3. Fontes de verdade

| Fonte | O que estabelece |
| --- | --- |
| Mensagem do usuário (05/08/2026, esta tarefa) | `CriarAvaliacaoV2DTO` literal, regra carga↔tempo, proibição de unidade no DTO, arquitetura da porta de integração |
| `docs/evaluation-model-v2-proposal.md` §1-§7 | modelo de domínio, hierarquia, campos por bloco, `null` vs zero |
| `docs/frontend-plan.md` §0.5, §6, §12 | modelo v1 marcado como superado, bloqueios B6-B10 |
| `src/lib/medidas.ts:28-71` | sigla/rótulo/unidade dos 4 campos de amplitude + CMJ (ainda válidos: só a **chave do DTO** muda, não o significado da medida) |
| `src/lib/schemas.ts` | contrato **v1** vigente no backend — usado só para confirmar o que **não** copiar |
| `vitest.config.mts`, `src/lib/*.test.ts` | convenção de teste do projeto (Node, sem DOM) |

---

## 4. Contrato DTO definitivo do frontend

**[FRONTEND-DEFINIDO]**

```ts
// src/features/avaliacoes/contrato-v2.ts — CriarAvaliacaoV2DTO = z.infer<typeof schemaAvaliacaoV2Provisorio>

type CriarAvaliacaoV2DTO = {
  alunoId: string;
  dataAvaliacao: string; // "AAAA-MM-DD"
  amplitude: {
    tornozelo: { direito: number | null; esquerdo: number | null };
    quadril: { direito: number | null; esquerdo: number | null };
    isquiotibiais: { direito: number | null; esquerdo: number | null };
    slb: { direito: number | null; esquerdo: number | null };
  };
  saltos: {
    cmj: number | null;
    salto2: number | null;
    salto3: number | null;
    salto4: number | null;
    salto5: number | null;
  };
  velocidade: {
    squatJump: { cargaKg: number | null; tempoSegundos: number | null };
    agachamento: { cargaKg: number | null; tempoSegundos: number | null };
  };
  observacoes?: string;
};
```

Literal ao que a mensagem do usuário fixou. **Nenhuma unidade no payload** —
unidade é do catálogo do backend, derivada pela chave (`salto2`, `cargaKg` já
carregam a unidade no próprio nome onde ela é conhecida; onde não é conhecida —
os quatro saltos — o campo não tem unidade nenhuma embutida, de propósito,
porque a unidade real é B6, ainda em aberto).

### 4.1 Zod — contrato provisório de propriedade do frontend

**[FRONTEND-DEFINIDO] — PROVISÓRIO, com prazo de vida definido.** Este schema
**não vem de `@/lib/schemas`** e **não deve ser confundido com um contrato
oficial**. Nomenclatura deliberadamente inequívoca para isso: o arquivo chama-se
`contrato-v2.ts` (não `schemaV2.ts` — "v2" sozinho soa definitivo demais), e o
schema exportado chama-se `schemaAvaliacaoV2Provisorio` (não
`criarAvaliacaoV2Schema` — o sufixo "Provisorio" precisa aparecer em todo lugar
que o importa, para que nenhum código futuro trate isto como fonte de verdade
por engano).

O backend ainda só publica o contrato v1 em `src/lib/schemas.ts`; escrever
`schemaAvaliacaoV2Provisorio` como módulo próprio do frontend é o que torna
este documento — e o código que ele descreve — a proposta concreta que o
backend revisa. **Este arquivo será apagado.** Quando o backend publicar seu
próprio schema v2 em `docs/api.md`/`src/lib/schemas.ts`, `contrato-v2.ts` é
substituído pelo import do schema oficial, não mantido em paralelo — a lista
de critérios que fecha essa substituição está em §13.5, e é obrigatória, não
opcional.

```ts
// src/features/avaliacoes/contrato-v2.ts
//
// PROVISÓRIO. Contrato desejado pelo frontend, ainda não confirmado pelo
// backend. Será REMOVIDO e substituído por um import de `@/lib/schemas`
// assim que o backend publicar a versão v2 ali e em docs/api.md — ver a
// especificação, §13.5, para a lista de critérios que fecha essa troca.
// Não promover este módulo a fonte de verdade permanente.
import { z } from "zod";

const valorMedida = z.number().min(0).nullable(); // zero é dado real; negativo não existe (mesma regra da E5 v1)

const parBilateral = z.object({
  direito: valorMedida,
  esquerdo: valorMedida,
});

const amplitudeSchema = z.object({
  tornozelo: parBilateral,
  quadril: parBilateral,
  isquiotibiais: parBilateral,
  slb: parBilateral,
});

const saltosSchema = z.object({
  cmj: valorMedida,
  salto2: valorMedida,
  salto3: valorMedida,
  salto4: valorMedida,
  salto5: valorMedida,
});

/**
 * Regra de consistência (mensagem do usuário): carga e tempo, os dois
 * preenchidos ou os dois `null`. `[FRONTEND-DEFINIDO]`: `cargaKg` aceita
 * zero — Squat Jump sem carga externa (peso corporal) é medição legítima
 * (evaluation-model-v2-proposal.md §6.3, DÚVIDA ainda aberta com o cliente).
 * Se o backend decidir o contrário, só esta linha muda.
 */
const exercicioVelocidadeSchema = z
  .object({
    cargaKg: z.number().min(0).nullable(),
    tempoSegundos: z.number().positive().nullable(), // nunca 0: divisão por zero
  })
  .superRefine((valor, ctx) => {
    const cargaPreenchida = valor.cargaKg !== null;
    const tempoPreenchido = valor.tempoSegundos !== null;
    if (cargaPreenchida && !tempoPreenchido) {
      ctx.addIssue({
        code: "custom",
        path: ["tempoSegundos"],
        message: "Informe o tempo junto com a carga.",
      });
    }
    if (tempoPreenchido && !cargaPreenchida) {
      ctx.addIssue({
        code: "custom",
        path: ["cargaKg"],
        message: "Informe a carga junto com o tempo.",
      });
    }
  });

const velocidadeSchema = z.object({
  squatJump: exercicioVelocidadeSchema,
  agachamento: exercicioVelocidadeSchema,
});

export const schemaAvaliacaoV2Provisorio = z.object({
  alunoId: z.uuid("alunoId precisa ser um UUID"),
  dataAvaliacao: z.iso.date("dataAvaliacao no formato AAAA-MM-DD"),
  amplitude: amplitudeSchema,
  saltos: saltosSchema,
  velocidade: velocidadeSchema,
  observacoes: z.string().trim().optional(),
});

export type CriarAvaliacaoV2DTO = z.infer<typeof schemaAvaliacaoV2Provisorio>;
```

**[A VERIFICAR NA IMPLEMENTAÇÃO]** Que `ctx.addIssue({ path: ["cargaKg"] })`
dentro do `.superRefine` de `exercicioVelocidadeSchema`, quando este schema
está aninhado em `velocidadeSchema.squatJump`, produz um `issue.path` final
igual a `["velocidade", "squatJump", "cargaKg"]` (Zod prefixa o caminho
relativo com o caminho de aninhamento). É o comportamento documentado do Zod,
mas **precisa** de um teste unitário que prove exatamente essa string (§19),
porque é dela que depende o `name` do input correspondente (§6).

---

## 5. Regras de consistência

**[FRONTEND-DEFINIDO]**, consolidando o que está espalhado nas seções acima:

| Regra | Onde é aplicada |
| --- | --- |
| `null` = não medido; `0` = medido e deu zero; nunca confundir os dois | parser (§7), mapper (§8), texto de apoio dos fieldsets (§17) |
| As 4 chaves de `amplitude`, as 5 de `saltos` e as 2 de `velocidade` estão **sempre presentes** no DTO, mesmo todas `null` | mapper (§8), espelha a regra já estabelecida para `medidas` no v1 |
| Carga e tempo: ambos preenchidos, ou ambos `null` | `superRefine` (§4.1) |
| Nenhuma unidade no payload | mapper nunca lê nem escreve uma chave `unidade` (contraste direto com o v1, que sempre enviava `unidade: "cm"/"kg"/"s"`) |
| `observacoes` vazia → chave **omitida** do DTO (não `""`, não `null`) | mesma regra da E5 v1, mantida por não ter motivo para mudar |
| `alunoId` nunca é um campo do formulário | vem do path da rota, propagado por `.bind()` na ação (§11) |

---

## 6. Shape de `FormData` e `name` exatos dos inputs

**[FRONTEND-DEFINIDO]** Mesmo princípio da E5 v1 (`e5-implementation-spec.md`
§9.4): o `name` de cada input é **idêntico** ao caminho pontilhado que o Zod
produz em `issue.path.join(".")`. Sem tabela de tradução.

| # | Bloco | `name` | Tipo de input | Nulo? | Zero? |
| --- | --- | --- | --- | --- | --- |
| 1 | cabeçalho | `dataAvaliacao` | `type="date"` | não (obrigatório) | — |
| 2 | cabeçalho | `observacoes` | `textarea` | sim (vira chave omitida) | — |
| 3 | Amplitude | `amplitude.tornozelo.direito` | `text` + `inputMode="decimal"` | sim | sim |
| 4 | Amplitude | `amplitude.tornozelo.esquerdo` | idem | sim | sim |
| 5 | Amplitude | `amplitude.quadril.direito` | idem | sim | sim |
| 6 | Amplitude | `amplitude.quadril.esquerdo` | idem | sim | sim |
| 7 | Amplitude | `amplitude.isquiotibiais.direito` | idem | sim | sim |
| 8 | Amplitude | `amplitude.isquiotibiais.esquerdo` | idem | sim | sim |
| 9 | Amplitude | `amplitude.slb.direito` | idem | sim | sim |
| 10 | Amplitude | `amplitude.slb.esquerdo` | idem | sim | sim |
| 11 | Salto | `saltos.cmj` | idem | sim | sim |
| 12 | Salto | `saltos.salto2` | idem | sim | sim |
| 13 | Salto | `saltos.salto3` | idem | sim | sim |
| 14 | Salto | `saltos.salto4` | idem | sim | sim |
| 15 | Salto | `saltos.salto5` | idem | sim | sim |
| 16 | Velocidade | `velocidade.squatJump.cargaKg` | idem | sim | **sim** (§4.1) |
| 17 | Velocidade | `velocidade.squatJump.tempoSegundos` | idem | sim | **não** (`positive()`) |
| 18 | Velocidade | `velocidade.agachamento.cargaKg` | idem | sim | sim |
| 19 | Velocidade | `velocidade.agachamento.tempoSegundos` | idem | sim | não |

**19 campos nomeados**, nenhum array, nenhum índice numérico em nome de campo —
todos conhecidos em tempo de compilação. Contraste direto com a E5 v1, cujos
`name` incluíam `testes.{i}.tentativas.{j}.*`.

`type="text"` + `inputMode="decimal"` em todos os 17 campos numéricos, nunca
`type="number"` — mesmo motivo da E5 v1 (`e5-implementation-spec.md` §5):
`"11,5"` em `type="number"` devolve `input.value === ""`.

---

## 7. Parser decimal e `null` versus zero

**[REUTILIZADO-V1]** `src/features/avaliacoes/decimal.ts` — **só `paraNumero`**,
copiado sem alteração de `feat/evaluation-form`:

```ts
export type ResultadoNumero = { ok: true; valor: number | null } | { ok: false };

const DECIMAL = /^-?\d+([.,]\d+)?$/;

export function paraNumero(bruto: string): ResultadoNumero {
  const texto = bruto.trim();
  if (texto === "") return { ok: true, valor: null };
  if (!DECIMAL.test(texto)) return { ok: false };
  return { ok: true, valor: Number(texto.replace(",", ".")) };
}
```

**`paraInteiro` não é trazido** — não existe mais nenhum campo inteiro no DTO
(repetições não existe no v2). Todos os 17 campos numéricos usam `paraNumero`.

Tabela de comportamento: idêntica a `e5-implementation-spec.md` §8.2 (`""` →
`null`, `"11,5"`/`"11.5"` → `11.5`, `"0"` → `0`, milhar/científica/sinal `+`
rejeitados). Não repetida aqui por já estar coberta pelo teste unitário (§19).

---

## 8. Mapeamento para o DTO

**[FRONTEND-DEFINIDO]**, arquitetura herdada de `formDataParaDTO` da E5 v1, mas
sem laço de testes/tentativas — muito mais curto:

```ts
// src/features/avaliacoes/mappers.ts

export function formDataParaDTO(
  fd: FormData,
  alunoId: string,
): { dto: Record<string, unknown>; errosLexicais: ErrosAvaliacaoV2 } {
  const errosLexicais: ErrosAvaliacaoV2 = {};
  const txt = (name: string) => String(fd.get(name) ?? "");

  const num = (name: string): number | null | undefined => {
    const resultado = paraNumero(txt(name));
    if (!resultado.ok) {
      errosLexicais[name] = MSG_FORMATO;
      return undefined;
    }
    return resultado.valor;
  };

  const par = (base: string) => ({
    direito: num(`${base}.direito`) ?? null,
    esquerdo: num(`${base}.esquerdo`) ?? null,
  });

  const exercicio = (base: string) => ({
    cargaKg: num(`${base}.cargaKg`) ?? null,
    tempoSegundos: num(`${base}.tempoSegundos`) ?? null,
  });

  const observacoes = txt("observacoes").trim();

  return {
    dto: {
      alunoId,
      dataAvaliacao: txt("dataAvaliacao"),
      amplitude: {
        tornozelo: par("amplitude.tornozelo"),
        quadril: par("amplitude.quadril"),
        isquiotibiais: par("amplitude.isquiotibiais"),
        slb: par("amplitude.slb"),
      },
      saltos: {
        cmj: num("saltos.cmj") ?? null,
        salto2: num("saltos.salto2") ?? null,
        salto3: num("saltos.salto3") ?? null,
        salto4: num("saltos.salto4") ?? null,
        salto5: num("saltos.salto5") ?? null,
      },
      velocidade: {
        squatJump: exercicio("velocidade.squatJump"),
        agachamento: exercicio("velocidade.agachamento"),
      },
      ...(observacoes ? { observacoes } : {}),
    },
    errosLexicais,
  };
}
```

### 8.1 Regras que o mapper garante

1. As 4 chaves de `amplitude`, as 5 de `saltos` e as 2 de `velocidade` **sempre
   presentes**, com `null` nos campos vazios — nunca `0`, `""`, `NaN` ou
   `undefined`.
2. **Nenhuma chave `unidade`** é escrita em lugar nenhum do objeto — diferença
   deliberada em relação ao mapper da E5 v1.
3. `observacoes` vazia → chave omitida (§5).
4. Erro léxico não interrompe o mapeamento — todos são coletados de uma vez,
   igual à E5 v1.

### 8.2 Ordem de validação no submit

Igual à E5 v1 (`e5-implementation-spec.md` §9.3), com um passo a menos (não há
verificação de duplicidade — estruturalmente impossível):

```
1. errosLexicais do parser                        -> se houver, para aqui
2. schemaAvaliacaoV2Provisorio.safeParse          -> se falhar, mapeia issues e para aqui
3. enviarAvaliacaoV2(resultado.data)               -> porta de integração (§13)
```

**Enviar sempre `resultado.data`**, nunca o `dto` cru montado pelo mapper — o
Zod aplica `.trim()` em `observacoes`, e é esse valor aparado que deve valer.

---

## 9. Referência da avaliação anterior

### 9.1 O que pode ser mostrado hoje, e por quê

**[FRONTEND-DEFINIDO]** `GET /api/avaliacoes?alunoId={id}&limite=1` continua
existindo e devolvendo o formato **v1** (`medidas.mobilidadeTornozelo.direito`
etc.) — o backend não mudou nada ainda. As 4 medidas de amplitude e o CMJ **são
o mesmo dado físico** nos dois modelos; só a chave do envelope muda
(`medidas.mobilidadeTornozelo` no v1 ⇄ `amplitude.tornozelo` no v2). Portanto
**dá para mostrar referência real** para esses 5 campos, lendo a resposta v1 já
existente e remapeando as chaves no servidor:

```ts
// src/features/avaliacoes/mappers.ts
export type ReferenciaAnteriorV2 = {
  dataAvaliacao: string;
  amplitude: {
    tornozelo: { direito: number | null; esquerdo: number | null };
    quadril: { direito: number | null; esquerdo: number | null };
    isquiotibiais: { direito: number | null; esquerdo: number | null };
    slb: { direito: number | null; esquerdo: number | null };
  };
  cmj: number | null;
};

/** Remapeia o envelope v1 (`AvaliacaoCompleta.medidas`) pras chaves v2 — mesmo
 * dado, chave nova. Só cobre os 5 campos que já existiam no v1; não há
 * equivalente v1 para salto2-5 nem para velocidade (§9.2). */
export function referenciaV2DeAvaliacaoV1(
  avaliacao: Pick<AvaliacaoCompleta, "dataAvaliacao" | "medidas">,
): ReferenciaAnteriorV2 {
  const m = avaliacao.medidas;
  return {
    dataAvaliacao: avaliacao.dataAvaliacao,
    amplitude: {
      tornozelo: { direito: m.mobilidadeTornozelo.direito, esquerdo: m.mobilidadeTornozelo.esquerdo },
      quadril: { direito: m.mobilidadeQuadril.direito, esquerdo: m.mobilidadeQuadril.esquerdo },
      isquiotibiais: { direito: m.amplitudeIsquiotibiais.direito, esquerdo: m.amplitudeIsquiotibiais.esquerdo },
      slb: { direito: m.slb.direito, esquerdo: m.slb.esquerdo },
    },
    cmj: m.cmj.valor,
  };
}
```

Chamado no **Server Component** da página (§14), a partir do mesmo
`resultadoReferencia` que a E5 v1 já buscava — nenhuma rota nova, nenhum
endpoint novo.

### 9.2 O que não pode ser mostrado, e por quê

**[PENDENTE-BACKEND]** `salto2`-`salto5` e os dois exercícios de `velocidade`
**não têm nenhum equivalente no modelo v1**. Não existe dado histórico nessas
chaves porque elas nunca foram gravadas sob nenhum nome — nem `SALTO_2`, nem
`SJ_1`/`VMP SJ_1` da planilha (que são outra coisa; ver
`evaluation-model-v2-proposal.md` §3.3, dúvida). **Não inventar um valor de
referência aqui.** `SaltosFieldset` (exceto CMJ) e `VelocidadeFieldset`
**não exibem nenhuma linha de referência** — nem "—", nem espaço reservado —
mesma regra já estabelecida para aluno sem avaliações (E5 v1 §12.3).

### 9.3 Apresentação

Idêntica à E5 v1 §12.3: rótulo **"Última: X cm"**, nunca dentro do `input`,
nunca como `placeholder`/`defaultValue`; rótulo `"Última avaliação (DD/MM/AAAA)"`
uma vez, no topo do fieldset de Amplitude e do de Salto (não repetido por
campo). Nenhuma comparação de desempenho, nenhum delta, nenhuma seta (E5 v1
§12.4 — continua sem respaldo de domínio).

---

## 10. Data da avaliação

**[REUTILIZADO-V1]** `hojeIsoSaoPaulo()`, copiado sem alteração de
`feat/evaluation-form` para `src/features/shared/formato.ts` (não existe nesta
branch — ver §2.3):

```ts
const formatadorIso = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hojeIsoSaoPaulo(): string {
  const partes = Object.fromEntries(
    formatadorIso.formatToParts(new Date()).map((parte) => [parte.type, parte.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}
```

Mesmas proibições da E5 v1 §13.1: nunca `new Date("AAAA-MM-DD")`, nunca
`toISOString()` para derivar a data local. `dataPadrao` calculada **no
servidor** (`page.tsx`) e passada como prop, evitando divergência de
hidratação.

---

## 11. Shape do estado de `useActionState`

**[FRONTEND-DEFINIDO]** Diferença central em relação à E5 v1: existe um
**terceiro desfecho**, distinto de sucesso e de erro — a submissão foi válida,
mas não pôde ser gravada porque o backend ainda é v1.

```ts
// src/features/avaliacoes/tipos.ts

/** Tudo como string bruta — o que o usuário digitou, e o que volta pro
 * defaultValue apos um erro (React 19 sempre reseta o form antes da action). */
export type ValoresAvaliacaoV2 = {
  dataAvaliacao: string;
  observacoes: string;
  /** Chaveado pelo `name` completo do campo — flat, sem aninhamento por
   * bloco: não há mais identidade de linha pra justificar uma estrutura
   * aninhada (contraste com o `medidas`/`testes` separados da E5 v1). */
  campos: Record<string, string>;
};

export type ErrosAvaliacaoV2 = Record<string, string>;

export type EstadoAvaliacaoV2 =
  | { status: "inicial" }
  | { status: "sucesso"; id: string }
  | {
      /** Validou tudo; não foi gravado porque o backend ainda é v1 (§13).
       * NUNCA tratar como sucesso, nunca limpar o rascunho, nunca navegar. */
      status: "pendente-integracao";
      mensagem: string;
      valores: ValoresAvaliacaoV2;
    }
  | {
      status: "erro";
      mensagem: string | null;
      errosPorCampo: ErrosAvaliacaoV2;
      valores: ValoresAvaliacaoV2;
      tentativa: number;
    };
```

Estado inicial: `{ status: "inicial" }`. `useActionState<EstadoAvaliacaoV2,
FormData>` — mesma assinatura da E5 v1 (`e5-implementation-spec.md` §7.5),
**proibido** virar Server Action pelo mesmo motivo (`frontend-plan.md` §2.3).

A ação é ligada por `.bind(null, { alunoId })` — **sem `linhas`**: não há mais
identidade de linha nenhuma para carregar (diferença central em relação a
`criarAvaliacao.bind(null, { alunoId, linhas })` da E5 v1).

---

## 12. Rascunho local — versão 2

**[FRONTEND-DEFINIDO]**, arquitetura idêntica à E5 v1 (`e5-implementation-spec.md`
§11), simplificada porque não há mais linhas a reconstruir:

```ts
// src/features/avaliacoes/rascunho.ts

export const VERSAO_RASCUNHO = 2;

export type Rascunho = {
  versao: number;
  alunoId: string;
  salvoEm: string;
  valores: ValoresAvaliacaoV2;
};

export const chaveRascunho = (alunoId: string) =>
  `gym-app:rascunho-avaliacao:v${VERSAO_RASCUNHO}:${alunoId}`;
```

| Item | Decisão |
| --- | --- |
| Versão | **2** — herda a recomendação já registrada em `evaluation-model-v2-proposal.md` §8 |
| `linhasDoRascunho` | **não existe** — `valores.campos` já é a estrutura inteira; restaurar é aplicar `valores` direto, sem reconstruir identidade nenhuma |
| Rascunho v1 remanescente | **nunca lido** — a chave inclui a versão; um rascunho `v1:` de sessão anterior fica órfão e inofensivo, nunca é encontrado por `lerRascunho` |
| Gravação | `onInput` no `<form>` (delegação), debounce **800 ms**, leitura via `new FormData(formRef.current)`, **nenhum `setState`** — idêntico à E5 v1 §11.3 |
| Restauração | nunca silenciosa; faixa "Rascunho encontrado" com `Restaurar`/`Descartar` — idêntico à E5 v1 §11.4 |
| Descarte no sucesso | apagar a chave **antes** de navegar — só ocorre quando `enviarAvaliacaoV2` finalmente devolver `{ok:true}` (§13); **hoje é inalcançável**, e isso é esperado, não um bug |
| Descarte no erro | **nunca** — mantido |
| **Descarte no `pendente-integracao`** | **nunca** — nada foi salvo; apagar o rascunho aqui destruiria trabalho do professor sem motivo |
| `localStorage` indisponível | todo acesso em `try/catch`; formulário funciona sem rascunho |

---

## 13. Estratégia de integração provisória

### 13.1 A porta

**[FRONTEND-DEFINIDO]** Arquitetura escolhida entre as duas opções propostas:
a **B** (porta de transporte isolada) como forma, carregando o **comportamento
da A** (estado explícito, nenhuma requisição) enquanto o backend for v1. As
duas não são excludentes — a porta é o único lugar que muda quando deixarem de
sê-lo.

```ts
// src/features/avaliacoes/integracaoV2.ts

export type ResultadoIntegracaoV2 =
  | { ok: true; id: string }
  | { ok: false; motivo: "backend-v2-indisponivel" }
  | {
      ok: false;
      motivo: "erro-api";
      status: number;
      mensagem: string;
      issues?: { field: string; message: string }[];
    };

/**
 * Unica porta de submissao pro backend v2. Recebe SO o CriarAvaliacaoV2DTO
 * ja validado pelo Zod — nunca FormData, nunca o objeto cru do mapper.
 *
 * NUNCA converte para o contrato v1 (ordem/repeticoes/tentativas). Fazer
 * isso mentiria sobre o dominio: seria reintroduzir exatamente os valores
 * artificiais que evaluation-model-v2-proposal.md §10 rejeita.
 *
 * Ate o backend publicar o contrato v2 em docs/api.md, esta funcao devolve
 * {ok:false, motivo:"backend-v2-indisponivel"} SEM fazer nenhuma
 * requisicao HTTP. Trocar pra chamada real e alterar SO o corpo desta
 * funcao — nenhum outro arquivo do formulario muda.
 */
export async function enviarAvaliacaoV2(
  dto: CriarAvaliacaoV2DTO,
): Promise<ResultadoIntegracaoV2> {
  return { ok: false, motivo: "backend-v2-indisponivel" };
}
```

### 13.2 Como troca quando o backend publicar o contrato

```ts
export async function enviarAvaliacaoV2(
  dto: CriarAvaliacaoV2DTO,
): Promise<ResultadoIntegracaoV2> {
  const resposta = await apiFetch<{ id: string }>("/api/avaliacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!resposta.ok) {
    return {
      ok: false,
      motivo: "erro-api",
      status: resposta.erro.status,
      mensagem: resposta.erro.mensagem,
      issues: resposta.erro.issues,
    };
  }
  return { ok: true, id: resposta.dados.id };
}
```

**Nenhum outro arquivo muda nessa troca** — `acoes.ts`, `mappers.ts`,
`contrato-v2.ts`, os três fieldsets e o rascunho continuam exatamente como
estão. Isto é o que a spec chama de "fronteira de integração pendente" (§22,
commit final). **Exceto**: `contrato-v2.ts` em si tem prazo de vida — ver
§13.5, que é o critério que fecha essa troca de verdade.

### 13.3 Como o backend reconhece o contrato esperado por este commit

Três artefatos, todos executáveis (não só prosa):

1. `src/features/avaliacoes/contrato-v2.ts` — o Zod tipado
   (`schemaAvaliacaoV2Provisorio`) é a definição executável do contrato
   desejado.
2. `src/features/avaliacoes/__fixtures__/avaliacaoV2.ts` — os exemplos JSON
   completo e parcial de `evaluation-model-v2-proposal.md` §5, copiados
   literalmente e tipados como `CriarAvaliacaoV2DTO`, usados em
   `contrato-v2.test.ts` (§19). O backend pode rodar `npm test` e ver os
   mesmos exemplos que já revisou no documento validando contra o schema real.
3. A mensagem do commit final (§22) — resume a fronteira em uma frase, sem
   exigir que o backend leia código para descobrir o que falta.

### 13.5 Critérios obrigatórios da integração futura — fora do escopo desta etapa

**[PENDENTE-BACKEND]** `contrato-v2.ts` **não é para durar.** Ele existe para
este commit ser revisável hoje; no dia em que o backend publicar o contrato
v2 real, uma etapa futura (não esta) precisa fechar todos os itens abaixo
antes de considerar a integração pronta — nenhum é opcional, nenhum pode ficar
"pra depois":

1. **Importar o schema oficial** de `@/lib/schemas` (ou onde o backend
   publicar a versão v2) no lugar de `schemaAvaliacaoV2Provisorio`.
2. **Remover `contrato-v2.ts`** por completo — a duplicação local não fica
   como "alternativa" nem como referência histórica dentro de `src/`; vira
   histórico só no git.
3. **Conferir os paths literais de `issues[].field`** que o servidor real
   devolve contra os que `contrato-v2.ts` assumia (§4.1, nota
   [A VERIFICAR NA IMPLEMENTAÇÃO]) — inclusive os dois paths produzidos pelo
   `superRefine` de carga↔tempo, que são dedução, não medição.
4. **Testar `POST` real contra os cinco desfechos**: `201` (sucesso), `422`
   (validação), `404` (aluno sumiu), `500` (erro interno) e falha de rede —
   os quatro últimos têm código escrito em §13.4 mas **nunca exercitados**
   nesta etapa, porque `enviarAvaliacaoV2` não os alcança hoje.
5. **Trocar o estado `pendente-integracao` pelo fluxo real**: com o `POST`
   funcionando, esse ramo do `switch` em `acoes.ts` deixa de ser alcançável.
   Removê-lo é sinal de que a integração fechou, não um passo a evitar.

Só depois desses cinco itens fechados é que o link "Nova avaliação" entra na
ficha do aluno e o botão muda de rótulo (§1.6, §17.1).

### 13.4 Como a ação usa a porta — visão de conjunto

```ts
// src/features/avaliacoes/acoes.ts (resumo; ver §11 pro shape do estado)

export async function criarAvaliacaoV2(
  contexto: { alunoId: string },
  estadoAnterior: EstadoAvaliacaoV2,
  formData: FormData,
): Promise<EstadoAvaliacaoV2> {
  const valores = formDataParaValoresV2(formData);
  const tentativaAnterior = estadoAnterior.status === "erro" ? estadoAnterior.tentativa : 0;

  const { dto, errosLexicais } = formDataParaDTO(formData, contexto.alunoId);
  if (Object.keys(errosLexicais).length > 0) {
    return { status: "erro", mensagem: null, errosPorCampo: errosLexicais, valores, tentativa: tentativaAnterior + 1 };
  }

  const resultado = schemaAvaliacaoV2Provisorio.safeParse(dto);
  if (!resultado.success) {
    const { errosPorCampo, mensagemGeral } = issuesParaErros(zodErrorParaIssues(resultado.error));
    return { status: "erro", mensagem: mensagemGeral, errosPorCampo, valores, tentativa: tentativaAnterior + 1 };
  }

  const resposta = await enviarAvaliacaoV2(resultado.data);

  if (resposta.ok) return { status: "sucesso", id: resposta.id };

  if (resposta.motivo === "backend-v2-indisponivel") {
    return { status: "pendente-integracao", mensagem: MENSAGEM_BACKEND_INDISPONIVEL, valores };
  }

  // motivo "erro-api" — código escrito e testável por forma, mas hoje
  // inalcançável: enviarAvaliacaoV2 nunca devolve esse ramo (§13.1).
  if (resposta.status === 422 && resposta.issues) {
    const { errosPorCampo, mensagemGeral } = issuesParaErros(resposta.issues);
    return { status: "erro", mensagem: mensagemGeral, errosPorCampo, valores, tentativa: tentativaAnterior + 1 };
  }
  return { status: "erro", mensagem: mensagemDoErro(resposta.status), errosPorCampo: {}, valores, tentativa: tentativaAnterior + 1 };
}
```

`MENSAGEM_BACKEND_INDISPONIVEL` (texto fixo, não reescrever — §23):

> "Preenchimento validado. A gravação real depende do backend publicar o
> contrato v2 (consulte docs/evaluation-model-v2-proposal.md). **Nada foi
> salvo.**"

Escolhido de propósito para não usar o verbo "salvar" em nenhuma forma — o
botão que dispara esta ação chama-se "Validar preenchimento" (§17.1), e a
mensagem de retorno precisa usar o mesmo verbo, nunca sugerir gravação.

---

## 14. Árvore Server/Client

**[FRONTEND-DEFINIDO]**, mesma fronteira mínima da E5 v1
(`e5-implementation-spec.md` §17), **acrescida do aviso persistente exigido
em §17.1**:

```
app/alunos/[id]/avaliacoes/nova/page.tsx           SERVER
├─ GET /api/alunos/:id                  -> 404 => notFound()
├─ GET /api/avaliacoes?alunoId&limite=1 (referência v1, remapeada — §9.1)
└─ <AvaliacaoFormV2                                 CLIENT  ("use client")
     alunoId, alunoNome, alunoAtivo,
     referencia={ dataAvaliacao, amplitude, cmj } | null
     dataPadrao={hojeIsoSaoPaulo()}                 <- calculada no servidor
   />
   ├─ <AvisoFormularioProvisorio />                 CLIENT (sem "use client" próprio)
   │    — SEMPRE visível, acima de tudo, independe do estado da ação (§17.1)
   ├─ <FaixaRascunho />                              idem
   ├─ <ResumoErros />                                idem
   ├─ <AmplitudeFieldset  referencia erros valores />
   ├─ <SaltosFieldset     referencia erros valores />
   └─ <VelocidadeFieldset erros valores />
```

`"use client"` aparece **uma vez**, em `AvaliacaoFormV2.tsx`. Os quatro
componentes de apoio (`AvisoFormularioProvisorio`, `FaixaRascunho`,
`ResumoErros`, os três fieldsets) são módulos de apresentação puxados por
inclusão — igual à regra da E5 v1. **A página permanece Server Component.**

---

## 15. Estrutura exata de arquivos

### 15.1 Criar

| Caminho | Tipo | Conteúdo |
| --- | --- | --- |
| `src/app/alunos/[id]/avaliacoes/nova/page.tsx` | Server | rota, busca, composição, remapeamento da referência (§9.1) |
| `src/app/alunos/[id]/avaliacoes/nova/loading.tsx` | Server | esqueleto — 3 blocos, não N blocos dinâmicos |
| `src/features/avaliacoes/tipos.ts` | módulo | `ValoresAvaliacaoV2`, `ErrosAvaliacaoV2`, `EstadoAvaliacaoV2` (§11) |
| `src/features/avaliacoes/catalogoV2.ts` | módulo | constantes de sigla/rótulo dos 3 blocos (§17.2) |
| `src/features/avaliacoes/decimal.ts` | módulo | `paraNumero` (§7) |
| `src/features/avaliacoes/contrato-v2.ts` | módulo | `schemaAvaliacaoV2Provisorio`, `CriarAvaliacaoV2DTO` (§4) — **provisório, ver §13.5** |
| `src/features/avaliacoes/mappers.ts` | módulo | `formDataParaValoresV2`, `formDataParaDTO`, `referenciaV2DeAvaliacaoV1`, `issuesParaErros`, `zodErrorParaIssues` (§8, §9) |
| `src/features/avaliacoes/rascunho.ts` | módulo | ler/gravar/limpar `localStorage` v2 (§12) |
| `src/features/avaliacoes/integracaoV2.ts` | módulo | `enviarAvaliacaoV2` — a porta (§13) |
| `src/features/avaliacoes/acoes.ts` | módulo | `criarAvaliacaoV2` (§13.4) |
| `src/features/avaliacoes/AvaliacaoFormV2.tsx` | **Client** | o formulário (§17) |
| `src/features/avaliacoes/AvisoFormularioProvisorio.tsx` | apresentação | aviso persistente de "nada é salvo" (§17.1) |
| `src/features/avaliacoes/AmplitudeFieldset.tsx` | apresentação | 8 campos (§17.2) |
| `src/features/avaliacoes/SaltosFieldset.tsx` | apresentação | 5 campos, com os 4 provisórios claramente marcados (§17.2, §17.3) |
| `src/features/avaliacoes/VelocidadeFieldset.tsx` | apresentação | 4 campos + regra mútua (§17.2) |
| `src/features/avaliacoes/__fixtures__/avaliacaoV2.ts` | fixture | exemplos JSON de `evaluation-model-v2-proposal.md` §5 (§13.3, §19) |
| `src/features/avaliacoes/decimal.test.ts` | teste | tabela de `paraNumero` |
| `src/features/avaliacoes/contrato-v2.test.ts` | teste | fixtures + regra carga↔tempo + paths de issue |
| `src/features/avaliacoes/mappers.test.ts` | teste | `FormData` sintético → DTO |
| `src/features/avaliacoes/integracaoV2.test.ts` | teste | `enviarAvaliacaoV2` nunca chama `fetch` (§19) |

Nenhum componente de UI genérico novo além de `AvisoFormularioProvisorio` —
`CampoFormulario` cobre os 19 campos.

### 15.2 Alterar

| Caminho | Alteração |
| --- | --- |
| `src/features/shared/formato.ts` | acrescentar `hojeIsoSaoPaulo()` (§10) |

**`src/app/alunos/[id]/page.tsx` não é alterado nesta etapa** — decisão
revisada em §1.6: nenhum link ou botão "Nova avaliação" entra na ficha
enquanto o backend for v1. A rota continua acessível por URL direta.

### 15.3 Preservar sem tocar

`prisma/**` · `src/app/api/**` · `src/lib/**` · `src/generated/**` ·
`package.json` · `docs/api.md` · `docs/frontend-plan.md` ·
`docs/evaluation-model-v2-proposal.md` · `src/features/alunos/**` **por
inteiro, incluindo `alunos/[id]/page.tsx`** (§1.6, §15.2) ·
`src/features/relatorio/**` · `src/components/ui/**`.

### 15.4 Protegidos — parada obrigatória (§23)

Mesma lista de `e5-implementation-spec.md` §18.4, acrescida de `docs/api.md`
(explícito nesta tarefa) e do próprio `src/features/avaliacoes/integracaoV2.ts`
**depois de escrito** — alterar seu corpo para de fato chamar a API é decisão
que só cabe quando o backend publicar o contrato (§13.2), não um refactor
espontâneo do implementador.

---

## 16. Reaproveitamento da branch `feat/evaluation-form` (histórica, não mergeada)

**[REUTILIZADO-V1]** vs. não trazido — inspeção completa de
`src/features/avaliacoes/**` e `src/app/alunos/[id]/avaliacoes/nova/**` nessa
branch (commit `87e7336`).

### 16.1 Padrões trazidos (arquitetura reaproveitada, código adaptado)

| Padrão | Origem (v1) | Como entra aqui |
| --- | --- | --- |
| `useActionState` + `.bind()` sem `ref` durante o render | `AvaliacaoForm.tsx`, `acoes.ts` | igual, mas o `.bind()` carrega só `{alunoId}` (§11) |
| Foco no primeiro erro via `querySelector('[aria-invalid="true"]')` + `tentativa` para reexecutar o efeito | `AvaliacaoForm.tsx:124-133` | copiado sem alteração |
| Guarda de duplo submit (`emAndamentoRef` + `onSubmit` `preventDefault`) | `AvaliacaoForm.tsx:107-110,229-235` | copiado sem alteração |
| Autosave por delegação `onInput` + debounce 800 ms + leitura via `ref`, nunca `setState` | `AvaliacaoForm.tsx:142-158` | copiado sem alteração |
| Rascunho: chave versionada por aluno, faixa nunca silenciosa, `try/catch` em todo acesso | `rascunho.ts` | arquitetura idêntica, versão 2, sem `linhasDoRascunho` (§12) |
| `issuesParaErros`/`zodErrorParaIssues`/`traduzirMensagem`, `name === field` | `mappers.ts:128-223` | mesma arquitetura, regex reescritas pros novos paths (§6) |
| `CampoFormulario` para label+input+apoio+erro | `MedidasFieldset.tsx` | reuso direto, sem mudança |
| `hojeIsoSaoPaulo()` | `formato.ts:80-98` (só existe na branch v1) | copiado sem alteração (§10) |
| `paraNumero` (parser léxico) | `decimal.ts:18-23` | copiado sem alteração (§7) |
| `nova/page.tsx`/`nova/loading.tsx` — busca aluno+referência, `notFound()`, skeleton | `nova/page.tsx`, `nova/loading.tsx` | mesma forma, simplificada (menos blocos no skeleton) |

### 16.2 Não trazido — descartado por não fazer mais sentido no domínio v2

| Item (v1) | Motivo do descarte |
| --- | --- |
| `TentativaItem.tsx` | não existem tentativas |
| `TesteItem.tsx` | não existem testes com lista |
| `TestesFieldset.tsx` | não existe lista dinâmica |
| `catalogo.ts` (`TESTES_DISPONIVEIS`, select fechado) | não há mais teste a **selecionar** — os dois exercícios de velocidade são campos fixos, não itens de uma lista |
| `LinhaTeste` (tipo de identidade de linha) | não há linha nenhuma para ter identidade |
| `linhasDoRascunho` | nada para reconstruir — o rascunho já é a estrutura final |
| `encontrarCodigoDuplicado`/`normalizar` (prevenção de duplicidade em `acoes.ts`) | chaves fixas tornam duplicidade sintaticamente impossível (`evaluation-model-v2-proposal.md` §6.4) |
| `paraInteiro` | não existe mais campo inteiro (repetições não existe) |
| Derivação de `ordem` a partir do índice | não existe `ordem` no v2 |
| Mensagem de 409 específica de "teste duplicado" | sem constraint de unicidade sobrando no domínio v2, um 409 genérico (se algum dia ocorrer) usa `mensagemDoErro(409)` |
| Botão "Adicionar teste"/"Adicionar tentativa", `aria-live` de linha adicionada/removida | não há o que adicionar ou remover |

> Nada disto existe fisicamente nesta branch (`feat/evaluation-form-v2`) — a
> E5 v1 nunca foi mergeada. "Não trazido" significa: ao consultar
> `feat/evaluation-form` como referência, **não portar** esses arquivos nem
> seus padrões, não que algo precise ser apagado daqui.

---

## 17. Experiência da página

### 17.1 Hierarquia visual

**[FRONTEND-DEFINIDO]**

```
← Voltar (para /alunos/[id])
h1  "Nova avaliação"
    subtítulo: {nome do aluno} [Badge "Inativo" se aplicável]

[AVISO PERSISTENTE — sempre visível, acima de tudo (§17.1.1)]

[faixa de rascunho, quando houver]
[resumo de erros, role="alert", quando houver >1 erro ou erro geral]
[faixa "preenchimento validado", role="status", só após um submit desse tipo]

fieldset  "Data e observações"
   Data da avaliação *            (type=date, padrão hoje em São Paulo)
   Observações                    (textarea, opcional)

fieldset  "Amplitude"
   texto de apoio: em branco ≠ zero
   [referência: "Última avaliação em DD/MM/AAAA", só se houver]
   TOR  [direito] [esquerdo]   cm
   QUA  [direito] [esquerdo]   cm
   IQT  [direito] [esquerdo]   cm
   SLB  [direito] [esquerdo]   cm

fieldset  "Salto"
   [referência do CMJ, só do CMJ]
   texto de apoio: unidade ainda não confirmada nos 4 campos provisórios
   CMJ                    [valor]   cm
   Resultado de salto 2   [valor]        <- sem unidade (B6 em aberto)
   Resultado de salto 3   [valor]
   Resultado de salto 4   [valor]
   Resultado de salto 5   [valor]

fieldset  "Velocidade"
   Squat Jump    [carga kg] [tempo s]
   Agachamento   [carga kg] [tempo s]

[Validar preenchimento]  [Cancelar]
```

Ordem dos blocos: Amplitude → Salto → Velocidade, exatamente como o cliente
enunciou (`evaluation-model-v2-proposal.md` §2). Data e observações continuam
no topo por serem cabeçalho da sessão.

#### 17.1.1 Aviso persistente — texto exato, não reescrever

**[FRONTEND-DEFINIDO]**, exigido em §1.6. Renderizado por
`AvisoFormularioProvisorio`, **sempre visível**, acima da faixa de rascunho e
do resumo de erros, **independente do estado da ação** (aparece antes de
qualquer submit, continua depois). `role="status"`, sem `aria-live` — não é um
anúncio de mudança, é contexto estrutural da tela.

> **Título:** "Formulário em desenvolvimento"
>
> **Corpo:** "Esta tela ainda não salva avaliações. O backend não publicou o
> contrato necessário para o novo modelo de avaliação. Use esta página apenas
> para validar o preenchimento — nenhum dado é enviado ao servidor."

Este texto **e** a mensagem pós-submit de §13.4 (`MENSAGEM_BACKEND_INDISPONIVEL`)
coexistem e **não são redundantes por acidente**: o primeiro é uma advertência
estrutural da tela (aparece mesmo que o professor nunca clique em nada); o
segundo é a confirmação do resultado de uma tentativa específica de validação.
Remover qualquer um dos dois enfraquece a garantia de que ninguém sai desta
tela achando que salvou uma avaliação.

### 17.1.2 Rótulo do botão de submit

**[FRONTEND-DEFINIDO]**, texto fixo, não reescrever: **"Validar
preenchimento"** — nunca "Salvar avaliação" enquanto `enviarAvaliacaoV2` não
gravar de verdade (§13.2). Durante `pending`: **"Validando…"** (não
"Salvando…", pelo mesmo motivo). A troca de rótulo para "Salvar avaliação"
acontece **no mesmo commit** que troca o corpo de `enviarAvaliacaoV2` para a
chamada real — nunca antes, nunca separadamente (§1.6, §13.5).

### 17.2 Catálogo local dos 3 blocos

**[FRONTEND-DEFINIDO]** `src/features/avaliacoes/catalogoV2.ts` — reaproveita
sigla/rótulo de `@/lib/medidas` onde a medida já existia lá (amplitude + CMJ);
declara os novos campos (saltos 2-5, exercícios de velocidade) a mão, porque
não existem no catálogo do backend ainda. **Ponto único de troca**: quando
B6 for respondido, só este arquivo muda — nenhum fieldset, nenhum mapper,
nenhum teste precisa saber que o rótulo ou a unidade mudaram.

```ts
import { medidaPorChave } from "@/lib/medidas";

export const CAMPOS_AMPLITUDE = [
  { chaveDto: "tornozelo", ...medidaPorChave("mobilidadeTornozelo") },
  { chaveDto: "quadril", ...medidaPorChave("mobilidadeQuadril") },
  { chaveDto: "isquiotibiais", ...medidaPorChave("amplitudeIsquiotibiais") },
  { chaveDto: "slb", ...medidaPorChave("slb") },
] as const;

export const CAMPO_CMJ = { chaveDto: "cmj", ...medidaPorChave("cmj") } as const;

/**
 * SLOTS PROVISÓRIOS — nome e unidade não confirmados (B6,
 * evaluation-model-v2-proposal.md §3.2, §15). `rotulo` usa "Resultado de
 * salto N", não um nome de exercício, de propósito: nomear como se fosse um
 * exercício específico (ex. "Drop Jump") seria inventar um fato que ninguém
 * confirmou. Sem `unidade` nenhuma — não inventar `cm`, `%` nem `m/s`.
 *
 * Ponto único de troca: quando B6 for respondido, só `rotulo` (e, se
 * necessário, uma `unidade` nova) mudam aqui. Nenhum outro arquivo sabe que
 * este catálogo é provisório.
 */
export const SALTOS_PROVISORIOS = [
  { chaveDto: "salto2", rotulo: "Resultado de salto 2", provisorio: true },
  { chaveDto: "salto3", rotulo: "Resultado de salto 3", provisorio: true },
  { chaveDto: "salto4", rotulo: "Resultado de salto 4", provisorio: true },
  { chaveDto: "salto5", rotulo: "Resultado de salto 5", provisorio: true },
] as const;

export const EXERCICIOS_VELOCIDADE = [
  { chaveDto: "squatJump", rotulo: "Squat Jump" },
  { chaveDto: "agachamento", rotulo: "Agachamento" },
] as const;
```

`medidaPorChave` já existe em `src/lib/medidas.ts:83-84` — importado como
**tipo e runtime**, permitido por `frontend-plan.md` §7.2. O campo
`provisorio: true` em `SALTOS_PROVISORIOS` não é lido por lógica nenhuma hoje
— existe para marcar a intenção no código, e para `SaltosFieldset.tsx` poder,
se quiser, aplicar um estilo visual distinto aos 4 campos sem CMJ (decisão de
composição, dentro da autonomia do implementador, §24).

### 17.3 Texto de apoio por bloco

| Bloco | Texto |
| --- | --- |
| Amplitude | "Deixe em branco o que não foi medido. Em branco é diferente de zero: zero significa que a medida foi feita e deu zero." (idêntico à E5 v1) |
| Salto (uma vez, acima dos 4 campos provisórios — não do CMJ, que já tem unidade confirmada) | "Unidade ainda não confirmada com o professor. Os quatro campos abaixo são registrados como número puro, sem cm, % ou m/s, até o backend publicar o catálogo definitivo." |
| Velocidade (cada exercício) | "Informe os dois campos juntos, ou deixe os dois em branco." |

### 17.4 Responsividade e acessibilidade

**[REUTILIZADO-V1]** Mesmas regras da E5 v1 (`e5-implementation-spec.md`
§19.2, §21), reduzidas ao que ainda se aplica sem lista dinâmica:

- Tablet-first: 360 px → 1 coluna; 768 px → pares direito/esquerdo lado a lado
  (Amplitude) e carga/tempo lado a lado (Velocidade); 1280 px → `max-w-3xl`.
- Alvos de toque **≥ 44 px** (`h-11 sm:h-9`, como em toda a base já mergeada).
- Par direito/esquerdo sempre visualmente agrupado.
- `fieldset`/`legend` por bloco; todo campo com `<label htmlFor>`.
- `aria-invalid` só no campo com erro; `aria-describedby` somando apoio +
  referência + erro.
- Resumo `role="alert"` só com >1 erro ou erro geral; faixa de
  `pendente-integracao` usa `role="status"` (não é erro, não interrompe leitor
  de tela do mesmo jeito).
- Foco visível herdado do fix já mergeado (commit `2903d60`, citado na E5 v1).
- **Sem lista para navegar por teclado além dos 19 campos + 2 botões** — a
  navegação por teclado é estritamente mais simples que na E5 v1.

---

## 18. Segurança e integridade

**[FRONTEND-DEFINIDO]**

- Backend continua sendo a autoridade final — quando `enviarAvaliacaoV2`
  finalmente chamar a API de verdade, todo 422 do servidor é exibido, nunca
  suprimido.
- `null` ≠ `0` garantido em três camadas (parser, mapper, texto de apoio).
- **Nenhuma escrita real é possível nesta etapa** (§1.5) — não há mutação
  otimista para proibir, porque não há mutação nenhuma.
- **Nenhuma mensagem do formulário pode sugerir sucesso** quando o resultado é
  `pendente-integracao`. Auditoria obrigatória em U5 (§21): buscar no código
  qualquer string que contenha "salv" fora do caminho `status === "sucesso"`.
- Rascunho isolado por aluno e por versão, sem nome do atleta armazenado
  (mesma regra da E5 v1 §11.8).
- Sem log de dado pessoal, sem `console.log` de conteúdo de formulário ou
  rascunho.

---

## 19. Estratégia de testes

### 19.1 O que pode ser concluído e validado sem backend v2 — automatizado (`vitest`)

Convenção do projeto (`src/lib/*.test.ts`) estendida para
`src/features/avaliacoes/*.test.ts`. Roda com `npm test`, sem servidor, sem
rede.

| Arquivo | Cobre |
| --- | --- |
| `decimal.test.ts` | tabela completa de `paraNumero` (§7): `""`→`null`, `"11,5"`/`"11.5"`→`11.5`, `"0"`→`0`, milhar/científica/sinal rejeitados |
| `contrato-v2.test.ts` | os exemplos completo e parcial de `__fixtures__/avaliacaoV2.ts` (espelhando `evaluation-model-v2-proposal.md` §5.1-§5.3) validam com `safeParse`; o exemplo §5.4 ("carga sem tempo") **falha** e a issue cai em `velocidade.squatJump.tempoSegundos` — **[A VERIFICAR NA IMPLEMENTAÇÃO]**, é o teste que confirma a dedução de §4.1; caso inverso (tempo sem carga) também testado |
| `mappers.test.ts` | `FormData` sintético (via `new FormData()` + `.set()`) → DTO: 19 campos vazios → todos `null`/chave `amplitude`/`saltos`/`velocidade` sempre presentes; `"11,5"` e `"11.5"` → `11.5`; `"0"` preservado como `0`; `observacoes` vazia → chave ausente no objeto resultante; nenhuma chave `unidade` aparece em lugar nenhum do DTO produzido |
| `integracaoV2.test.ts` | `enviarAvaliacaoV2` devolve sempre `{ok:false, motivo:"backend-v2-indisponivel"}`; com `vi.spyOn(global, "fetch")`, afirmar que **`fetch` nunca é chamado** |

### 19.2 O que pode ser concluído e validado sem backend v2 — manual (navegador)

Sem `jsdom`/RTL no projeto (§2.4), estes ficam para verificação manual, como já
era na E5 v1:

- Digitar em qualquer campo não dispara re-render (inspecionar via React
  DevTools Profiler ou `console.count` temporário, removido antes do commit).
- Rascunho: salvar, recarregar, oferecer, restaurar, descartar; nunca aplicado
  em silêncio; rascunho de versão `v1` (se existir de sessão anterior de
  outra etapa) é ignorado.
- O aviso persistente (§17.1.1) está visível **antes** de qualquer interação
  e continua visível depois; nunca desaparece sozinho.
- Submissão de um formulário totalmente preenchido e válido resulta na faixa
  "preenchimento validado" (`pendente-integracao`) — nunca na navegação para
  a ficha, nunca no texto de sucesso, nunca no apagamento do rascunho.
- Foco no primeiro erro, resumo `role="alert"`, `aria-describedby` correto.
- Duplo clique em "Validar preenchimento" produz **uma** invocação da ação
  (`console.count` temporário na própria `criarAvaliacaoV2`, removido antes
  do commit).
- Referência aparece só para os 5 campos com equivalente v1 (§9.1); ausente,
  sem espaço vazio, nos outros 6.
- Os 4 campos de `SaltosFieldset` sem CMJ exibem "Resultado de salto N", sem
  nenhuma unidade — nem no rótulo, nem no apoio, nem em `placeholder`.
- `/alunos/[id]/page.tsx` renderiza exatamente como antes desta etapa — sem
  link novo, sem botão novo (§1.6).
- Responsividade 360/768/1280 px e zoom 200%; teclado completo.
- `GET /alunos/:id` e `GET /avaliacoes?alunoId&limite=1` continuam
  funcionando exatamente como antes — a rota nova não altera nenhum
  comportamento de leitura existente.

### 19.3 O que fica pendente de integração — não executável hoje

| # | Pendência | Por que só depois |
| --- | --- | --- |
| 1 | `POST /api/avaliacoes` devolvendo `201` com o payload v2 | endpoint ainda espera o contrato v1 |
| 2 | Mapeamento de `issues[].field` **reais** do servidor v2 | os paths de `contrato-v2.ts` são o que o frontend propõe; só o backend confirma se batem |
| 3 | Tratamento real de `409`/`404`/`500` no fluxo de avaliação v2 | código escrito em §13.4, nunca exercitado, porque `enviarAvaliacaoV2` nunca devolve esses ramos hoje |
| 4 | Navegação após sucesso + atualização do histórico/contador na ficha | depende de um `201` real |
| 5 | Referência para `salto2-5` e `velocidade` | não existe dado histórico nessas chaves em lugar nenhum (§9.2) |
| 6 | Confirmação de que `docs/api.md` v2 usa exatamente estes nomes de chave | depende da revisão do backend sobre este commit |

---

## 20. Critérios de aceite

### Payload (verificado por `mappers.test.ts` e `contrato-v2.test.ts`)
- [ ] Os 17 campos numéricos vazios → `null` no DTO; nunca `0`, `""`, `NaN` ou `undefined`.
- [ ] As 4 chaves de `amplitude`, as 5 de `saltos` e as 2 de `velocidade` sempre presentes.
- [ ] `"11,5"` e `"11.5"` produzem ambos `11.5`.
- [ ] `0` digitado é preservado como `0` em todo campo que aceita zero (todos exceto `tempoSegundos`).
- [ ] Nenhuma chave `unidade` aparece em nenhum nível do DTO.
- [ ] `observacoes` vazia → chave omitida.
- [ ] Carga sem tempo (ou o inverso) é barrado, com erro no campo faltante.
- [ ] `alunoId` nunca é lido de um input — vem só do `.bind()`.

### Formulário (manual)
- [ ] Digitar em qualquer campo não re-renderiza nada.
- [ ] Duplo clique produz **uma** invocação da ação.
- [ ] `pending` desabilita o submit e troca o rótulo para "Validando…".
- [ ] Nenhum erro apaga o que foi digitado.
- [ ] O botão de submit chama-se **"Validar preenchimento"**, nunca "Salvar avaliação", em todo estado do formulário.

### Rota provisória e aviso persistente
- [ ] `/alunos/[id]/page.tsx` **não** tem link ou botão novo apontando para a rota (§1.6, §15.2).
- [ ] `AvisoFormularioProvisorio` aparece **sempre**, acima de tudo, com o texto exato de §17.1.1 — antes de qualquer interação e depois dela.
- [ ] O aviso não depende de `estado` (`useActionState`) para aparecer — é estrutural, não condicional a um submit.

### Integração provisória
- [ ] Submissão válida nunca exibe texto de sucesso — sempre a faixa "preenchimento validado" (`pendente-integracao`), com o texto fixo de §13.4.
- [ ] Rascunho **não** é apagado no estado `pendente-integracao`.
- [ ] Nenhuma navegação ocorre no estado `pendente-integracao`.
- [ ] `enviarAvaliacaoV2` nunca chama `fetch` (verificado em `integracaoV2.test.ts`).
- [ ] Nenhuma string "salv" (salvo/salva/salvar/salvando) aparece em nenhum texto de interface fora do caminho `status === "sucesso"` — auditoria de §18.

### Rascunho
- [ ] Versão `2`, chave isolada por aluno.
- [ ] Oferecido, nunca restaurado em silêncio.
- [ ] `localStorage` indisponível não quebra nem bloqueia o formulário.

### Referência
- [ ] "Última: X" aparece para os 5 campos com equivalente v1 quando há avaliação anterior.
- [ ] Nenhuma referência (nem espaço vazio) para `salto2-5` e `velocidade`.
- [ ] Nenhuma unidade exibida para `salto2-5` — nem `cm`, nem `%`, nem `m/s`, nem qualquer outra.
- [ ] Os 4 campos aparecem rotulados **"Resultado de salto 2"** a **"Resultado de salto 5"**, nunca "Salto 2"..."Salto 5".
- [ ] CMJ continua rotulado "CMJ" com unidade "cm" — não é um slot provisório.

### Acessibilidade e responsividade
- [ ] `fieldset`/`legend` por bloco; todo campo com `<label>`.
- [ ] Fluxo completo por teclado, incluindo a faixa de rascunho e a de "preenchimento validado".
- [ ] 360/768/1280 px e zoom 200% sem rolagem horizontal.
- [ ] Alvos de toque de 44 px.

### Integridade
- [ ] Nenhum arquivo de `prisma/`, `src/app/api/`, `src/lib/`, `prisma/seed.ts`, `docs/api.md` ou `src/app/alunos/[id]/page.tsx` alterado.
- [ ] Nenhuma dependência adicionada; `package.json` intacto.
- [ ] Os 3 alunos do seed intactos (nenhuma escrita real é possível — §1.5 — mas leituras via `GET` durante o teste manual não devem afetá-los).

### Automático
- [ ] `npm run typecheck` sem erro.
- [ ] `npm run lint` sem erro nem aviso novo.
- [ ] `npm run build` conclui, com `/alunos/[id]/avaliacoes/nova` aparecendo como `ƒ`.
- [ ] `npm test` — todos os `.test.ts` novos passam.

---

## 21. Unidades de implementação

### U1 — Contrato e lógica pura
**Objetivo.** Todo o DTO, schema, parser, mapper e porta de integração —
nenhuma tela ainda.
**Arquivos.** `tipos.ts`, `catalogoV2.ts`, `decimal.ts`, `contrato-v2.ts`,
`mappers.ts`, `integracaoV2.ts`, `__fixtures__/avaliacaoV2.ts`; acrescentar
`hojeIsoSaoPaulo()` em `formato.ts`.
**Validação.** `npm test` cobrindo `decimal.test.ts`, `contrato-v2.test.ts`,
`mappers.test.ts`, `integracaoV2.test.ts`; `typecheck`, `lint`, `build`.

### U2 — Ação, rascunho, aviso persistente e casca da página
**Objetivo.** Rota renderizando com o aviso persistente (§17.1.1), o
cabeçalho (data + observações) e a faixa "preenchimento validado" funcionando
ponta a ponta, ainda sem os três fieldsets de medida. **Nenhum link novo na
ficha do aluno** (§1.6).
**Arquivos.** `acoes.ts`, `rascunho.ts`, `AvisoFormularioProvisorio.tsx`,
`AvaliacaoFormV2.tsx` (versão mínima), `nova/page.tsx`, `nova/loading.tsx`.
`src/app/alunos/[id]/page.tsx` **não é tocado** nesta unidade nem em nenhuma
outra desta etapa.
**Validação.** Aviso persistente visível antes de qualquer interação. Botão
rotulado "Validar preenchimento", "Validando…" durante `pending`. Submeter só
com a data preenchida → faixa "preenchimento validado" aparece com o texto de
§13.4, rascunho não é apagado, nenhuma navegação ocorre. Rascunho salva e
restaura os dois campos do cabeçalho. Confirmar por leitura de código que
`src/app/alunos/[id]/page.tsx` está byte a byte igual ao que era antes desta
etapa.

### U3 — Amplitude e Salto
**Objetivo.** Os dois fieldsets de medida simples, com referência onde existe.
**Arquivos.** `AmplitudeFieldset.tsx`, `SaltosFieldset.tsx`.
**Validação.** `null` vs `0` ponta a ponta nos 13 campos; referência correta
para TOR/QUA/IQT/SLB/CMJ; ausência de referência e de unidade nos 4 campos
rotulados "Resultado de salto 2" a "Resultado de salto 5"; CMJ continua com
unidade "cm" visível.

### U4 — Velocidade
**Objetivo.** O fieldset com a regra de consistência carga↔tempo.
**Arquivos.** `VelocidadeFieldset.tsx`.
**Validação.** Ambos vazios aceito; ambos preenchidos aceito; um sem o outro
barrado com erro no campo faltante — testar as duas direções.

### U5 — Acessibilidade, responsividade, bordas e fronteira final
**Objetivo.** Fechar a etapa e deixar a fronteira de integração documentada.
**Arquivos.** Ajustes pontuais onde os testes apontarem; nenhum arquivo novo
esperado.
**Validação.** Checklist inteiro de §20; 360/768/1280 px e zoom 200%; teclado
completo; `typecheck`/`lint`/`build`/`test` finais; auditoria de §18 (nenhuma
string de sucesso fora do caminho certo).

---

## 22. Sequência de commits

Conventional Commits, mensagem em inglês, sem metadados de IA — mesma
convenção da E5 v1.

| # | Mensagem | Unidade |
| --- | --- | --- |
| 1 | `docs(frontend): add E5 v2 implementation spec and execution prompt` | planejamento (esta tarefa) |
| 2 | `feat(avaliacoes): add v2 DTO, decimal parser and pure mappers` | U1 |
| 3 | `feat(avaliacoes): add v2 evaluation route with draft-aware form shell` | U2 |
| 4 | `feat(avaliacoes): add amplitude and salto fieldsets` | U3 |
| 5 | `feat(avaliacoes): add velocidade fieldset with load-time consistency rule` | U4 |
| 6 | `fix(avaliacoes): cover v2 form edge cases and mark backend integration as pending` | U5 — **commit final** |

O commit 6 é o que a tarefa pede como "fronteira de integração pendente,
identificada claramente". Corpo obrigatório da mensagem (não apenas o título):

> `POST /api/avaliacoes` ainda espera o contrato v1 (testes[]/tentativas[],
> ordem, repeticoes) e `docs/api.md` não foi atualizado. Este formulário
> implementa o modelo v2 completo — validação, rascunho, acessibilidade — e
> `enviarAvaliacaoV2` (`src/features/avaliacoes/integracaoV2.ts`) devolve
> deterministicamente `backend-v2-indisponivel` sem chamar a API. Nenhuma
> avaliação real é gravada por este commit. Quando o backend publicar o
> contrato v2, `enviarAvaliacaoV2` é a única função que precisa mudar.

Rodar `typecheck`, `lint` e `test` antes de cada commit; `build` em todas as
unidades. Commitar **apenas** arquivos do projeto.

---

## 23. Paradas obrigatórias

Parar, descrever o achado com evidência (`caminho:linha`), propor alternativas
e **aguardar decisão**:

1. Necessidade de alterar `prisma/**`, `src/app/api/**`, `src/lib/**`,
   `prisma/seed.ts` ou `docs/api.md`.
2. Necessidade de **fazer `enviarAvaliacaoV2` chamar a API de verdade** — essa
   troca só acontece quando o backend publicar o contrato em `docs/api.md`
   (§13.2), nunca por antecipação dentro desta tarefa.
3. Necessidade de dependência nova.
4. Sinal concreto de que o backend vai divergir do DTO desta spec (ex.: PR ou
   comunicação do backend com nomes de chave diferentes) — não adivinhar,
   trazer para decisão.
5. Confirmação de B6 (unidade dos saltos) chegando durante a implementação —
   decidir se vale a pena já ajustar o catálogo local ou esperar o commit
   seguinte.
6. Impossibilidade comprovada de cumprir um critério de §20.
7. Mudança de arquitetura (Server/Client, `useActionState`, Server Actions,
   formulário controlado).
8. Risco a qualquer dado real do seed.
9. Comando destrutivo irreversível.
10. Necessidade de `push`, `merge`, `rebase` ou troca/exclusão de branch.
11. Necessidade de resolver globalmente os tokens da Nova.
12. Requisito de produto indispensável que esta spec não decidiu.
13. Necessidade de **adicionar o link "Nova avaliação" à ficha do aluno**, ou
    de **trocar o rótulo do botão** para "Salvar avaliação" — as duas coisas
    só acontecem juntas, no mesmo commit que troca `enviarAvaliacaoV2` para a
    chamada real (§1.6, §13.5, §17.1.2). Fazer qualquer uma isoladamente é
    parada obrigatória, não decisão de composição.

**Fora dessa lista, não pare.**

---

## 24. Autonomia do implementador

Mesma autonomia da E5 v1 (`e5-implementation-spec.md` §27): nomes locais,
organização interna, classes Tailwind dentro das regras de §17.4, divisão de
subcomponentes, textos auxiliares não fixados por esta spec, execução de
qualquer comando não destrutivo, `git add`/`git commit`.

**Textos fixados, não reescrever:** apoio de "em branco ≠ zero" e o apoio de
unidade pendente do Salto (§17.3); `MENSAGEM_BACKEND_INDISPONIVEL` (§13.4);
título e corpo do aviso persistente (§17.1.1); rótulo do botão "Validar
preenchimento"/"Validando…" (§17.1.2); rótulos "Resultado de salto 2" a
"Resultado de salto 5" (§17.2); rótulo "Última avaliação (data)" (§9.3);
mensagens de erro de carga↔tempo (§4.1).

---

## 25. Protocolo final e relatório esperado

1. Ler esta spec inteira antes de escrever qualquer linha.
2. Reler `docs/frontend-plan.md` §0.5, `docs/evaluation-model-v2-proposal.md`
   §1-§9, e `docs/e5-v2-execution-prompt.md`.
3. Implementar U1 → U5, na ordem, com os commits de §22.
4. **Não** fazer `push`, `merge`, `rebase` ou trocar de branch.
5. **Não** avançar para a E6.
6. **Não** fazer `enviarAvaliacaoV2` chamar a API de verdade (§23, item 2).
   **Não** adicionar o link na ficha nem trocar o rótulo do botão (§23,
   item 13).
7. Entregar um relatório final com: resumo do que foi feito; arquivos criados
   e alterados; commits com hash; resultado de `typecheck`/`lint`/`build`/
   `test`; critérios de §20 marcados um a um; casos de borda testados
   manualmente (§19.2) com resultado de cada um; pendências de §19.3
   reafirmadas como não resolvidas nesta etapa; `git status` final (deve
   estar limpo).

---

## 26. Bloqueios reais restantes (não resolvidos por esta spec)

| # | Bloqueio | Quem resolve | Efeito aqui |
| --- | --- | --- | --- |
| 1 | Nomes e unidade dos 4 saltos adicionais (B6) | cliente → backend | `SaltosFieldset` mostra "Resultado de salto N" sem unidade até então (§17.2, §17.3) |
| 2 | `carga.valor === 0` (Squat Jump sem carga externa) | backend, a confirmar | `contrato-v2.ts` já assume `min(0)` como decisão do frontend; se o backend decidir diferente, só essa linha muda (§4.1) |
| 3 | Contrato v2 ainda não publicado em `docs/api.md` | backend | é o próprio motivo desta spec existir — `enviarAvaliacaoV2` fica pendente até lá (§13), e é também o gatilho que apaga `contrato-v2.ts` (§13.5) |
| 4 | Paths reais de `issues[].field` do backend v2 | backend | os paths aqui são a proposta do frontend, testados só localmente (§19.3, item 2) |
| 5 | Futuro da curva carga-velocidade com ≤2 pontos (B9) | cliente | fora do escopo desta etapa (formulário, não relatório) — registrado só para não se perder |
| 6 | Ponto de entrada na ficha e rótulo definitivo do botão | esta equipe, quando a integração real existir | ambos ficam represados até `enviarAvaliacaoV2` gravar de verdade — nenhum dos dois é decisão técnica pendente, é consequência direta do bloqueio 3 (§1.6, §17.1.2) |

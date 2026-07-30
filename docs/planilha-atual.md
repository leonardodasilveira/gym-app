# O processo atual do cliente

Levantamento feito a partir do material que o cliente mandou em 30/07/2026:
um relatório de performance já pronto (imagem) e quatro fotos da planilha
`2026 - CT E PERFORM_NEW.xlsx` aberta num tablet.

**Não é especificação.** É o que dá pra afirmar olhando o material, mais o que
ficou em dúvida. As dúvidas estão marcadas com ❓ e reunidas no fim.

Contexto: cliente é o **CT E Perform**; quem monta e assina os relatórios é o
preparador físico (Junior). O material analisado é de um único atleta, com 21
avaliações entre 05/04/2023 e 30/04/2026.

> Os dados pessoais (nome do atleta, data de nascimento, CREF) foram omitidos
> deste documento de propósito — o repositório está público no GitHub. Os valores
> numéricos ficaram porque são a evidência do problema descrito em
> "[O buraco](#o-buraco-as-fórmulas-derivadas-não-fecham)".

---

## A descoberta principal

**O produto não é o registro do treino. É o relatório.**

A dor do cliente não é "anotar os treinos" — é *produzir aquele PDF por atleta*.
A planilha é só o meio. Isso define o loop central do MVP:

```
cadastrar avaliação  →  gerar relatório
```

E dá pra provar que os dois lados se conectam. A linha 1001 da planilha
(avaliação de 30/04/2026) contém:

| Carga (kg) | 20 | 40 | 45 | 50 | 55 | 60 | 65 | 70 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VMP (m/s) | 1,50 | 1,22 | 1,12 | 1,10 | 0,96 | 0,98 | 0,96 | 0,93 |

São exatamente os 8 pontos plotados no gráfico "Curva Força-Velocidade – Atual"
do relatório, batendo também com os campos "Nº de pontos da curva: 8" e "Carga
máxima testada: 70 kg".

**Uma linha da planilha = uma avaliação = um gráfico do relatório.**

## Estrutura da planilha

Uma aba, formato largo, uma linha por avaliação, todos os atletas juntos (~1000
linhas), filtrada por atleta na hora de usar.

| Colunas | Conteúdo |
| --- | --- |
| A–E | `DATA`, `Nº`, `ATLETA`, `DATA NASC`, `IDADE` |
| T–AB | `TOR DIR/ESQ`, `QUA DIR/ESQ`, `IQT DIR/ESQ`, `SLB DIR/ESQ` — testes bilaterais (quadríceps, isquiotibiais…), aparentemente pra análise de assimetria |
| AC–AJ | `CMJ`, `SJ`, `EUR`, `REL %`, `DJ 30`, `RSI` — bateria de saltos |
| AV em diante | `SJ_1`, `VMP SJ_1`, `SJ_2`, `VMP SJ_2`, `CARGA_1`, `VMP_1`, … até `CARGA_7`/`VMP_7` — o perfil carga-velocidade |

Duas leituras importantes:

1. **O escopo é maior que VBT.** A curva força-velocidade é *uma* seção de uma
   bateria que inclui saltos e força unilateral. ❓ O MVP cobre tudo ou só a curva?
2. **`CARGA_1..7` / `VMP_1..7` em colunas** é o formato-planilha clássico. No
   banco isso vira tabela filha — algo como `(avaliacao_id, ordem, carga_kg, vmp)`
   — o que resolve de graça o fato de umas avaliações terem 4 pontos e outras 8.

## Estrutura do relatório

Dez seções, na ordem em que aparecem:

1. **Resumo executivo** — CMJ inicial / pico / atual, com variação, e gráfico de
   evolução do CMJ ao longo de todas as avaliações.
2. **Curva força-velocidade atual** — dados da avaliação mais recente, gráfico
   velocidade × carga, classificação do perfil, zona de potência ótima.
3. **Evolução da curva** — sobreposição das curvas de 2023 / 2024 / 2026 e uma
   tabela "comparação em pontos chave".
4. **Análise técnica** — inclinação (slope), interceptos V0 e F0, zona de potência
   ideal, índice de qualidade da curva.
5. **Melhorias identificadas** — texto corrido, 3–4 bullets.
6. **Pontos de atenção** — texto corrido.
7. **Métricas principais** — tabela: CMJ, SJ, V0, F0, Pmáx (W/kg), carga ótima,
   velocidade na carga ótima, inclinação, qualidade da curva.
8. **Recomendações de treino** — três blocos (foco força / potência / velocidade),
   cada um com objetivo, estratégias e foco.
9. **Conclusão** — parágrafo assinado pelo preparador físico.
10. **Score de performance** — nota 0–100 com classificação (ex.: 82 / ALTO).

❓ **Seções 5, 6, 8 e 9 são escritas à mão ou geradas por regra?** Muda o tamanho
do MVP drasticamente: campo de texto rico versus motor de regras. O texto
"Levemente orientado à velocidade" claramente sai da inclinação da curva, o que
sugere que pelo menos parte é automática.

## O buraco: as fórmulas derivadas não fecham

Rodei uma regressão linear simples (OLS) nos 8 pontos de 2026 pra ver se os
números da seção "Análise técnica" saem de um ajuste direto sobre a curva
carga × velocidade. **Não saem:**

| | Calculado (OLS sobre os 8 pontos) | Relatório |
| --- | --- | --- |
| Inclinação | −0,0117 m/s·kg⁻¹ | −0,010 |
| V0 (vel. teórica máx.) | 1,69 m/s | 1,88 |
| F0 (força teórica máx.) | 144,5 kg | 122,1 |

E os números do próprio relatório não fecham entre si: com inclinação −0,010 e
V0 = 1,88, o F0 teria que ser 188 kg (1,88 ÷ 0,010), não 122,1.

**Hipótese:** V0, F0, Pmáx e carga ótima não vêm da reta carga × velocidade do
gráfico, e sim de um perfil **força-velocidade** de verdade — provavelmente o
método Samozino / Jiménez-Reyes para saltos, que usa massa corporal, altura do
salto e distância de push-off. O fato de `Pmáx` estar em **W/kg** (normalizado
por peso corporal) reforça isso. Nesse caso são dois modelos diferentes convivendo
no mesmo relatório: o gráfico mostra carga × velocidade, e a tabela mostra
força × velocidade.

> **Consequência prática:** enquanto essas fórmulas não estiverem na mão, o app
> guarda dados mas **não substitui a planilha**. Pedir o `.xlsx` e ler as fórmulas
> das células — o print não resolve.

Mesmo problema na tabela "comparação em pontos chave" da seção 3: a coluna de
2026 bate exatamente com a linha 1001, mas as colunas de 2023 e 2024 não batem
com nenhuma linha isolada da planilha. ❓ São valores interpolados da reta
ajustada? Melhor do ano? Média do ano? É regra escondida.

## Problemas de qualidade de dado já visíveis

Estes são bons argumentos de venda — o app elimina os três de graça:

- **Numeração manual duplicada.** As avaliações de 28/03/2025 e 13/06/2025 estão
  ambas com `Nº 15`. São 22 linhas numeradas de 1 a 21, e o relatório declara "21
  avaliações". O `Nº` é digitado à mão e já desandou.
- **Zero significando "não medido".** Uma avaliação (21/09/2023) tem `CMJ = 0` e
  `SJ = 0`. Zero e vazio querendo dizer a mesma coisa é armadilha clássica: no
  banco isso precisa ser `NULL`, senão qualquer média sai errada.
- **Avaliações parciais são a norma.** Muitas linhas não têm todos os testes
  preenchidos. O modelo tem que aceitar avaliação incompleta sem reclamar —
  nenhum campo de teste pode ser obrigatório.

## O que isso sugere pro MVP

Derivado do material, **a confirmar com o cliente** — não é decisão tomada:

- Cadastro de atletas.
- Cadastro de avaliação: data + atleta + N pontos `(carga, VMP)` + campos da
  bateria de testes, todos opcionais.
- Histórico de avaliações do atleta.
- Geração do relatório.

O volume de dados é irrisório (~170 medições por atleta em 3 anos), então nada
aqui exige arquitetura sofisticada. O risco do projeto **não** está no volume nem
na stack — está em reproduzir corretamente as fórmulas e os textos do relatório.

## Dúvidas em aberto

Numeradas pra facilitar a conversa com o cliente:

1. **De onde sai a VMP?** Qual encoder/app é usado, e ele exporta arquivo ou o
   professor digita na planilha?
2. **Qual exercício da curva?** Agachamento, jump squat, meio-agachamento? As
   velocidades (0,93 m/s a 70 kg) sugerem salto com carga, mas ele que confirma.
3. **Quais as fórmulas** de V0, F0, Pmáx, carga ótima, índice de qualidade da
   curva e score de performance? → **pedir o `.xlsx`**.
4. **Como são escolhidos os valores** das colunas 2023/2024 na tabela de
   comparação (interpolado / melhor / média)?
5. **Os textos das seções 5, 6, 8 e 9** são escritos a cada relatório ou gerados
   por regra?
6. **Escopo do MVP:** só a curva força-velocidade, ou a bateria toda (saltos +
   assimetrias)?
7. **Quantos atletas?** A planilha tem ~1000 linhas e o filtro de um atleta traz
   22 — sugere algo entre 40 e 50 atletas ativos.
8. **Quem usa o sistema?** Só o professor, ou o atleta também vê o próprio
   relatório?
9. **O relatório precisa sair em PDF** (pra mandar pro atleta) ou tela basta?
10. **Migrar o histórico?** Os 3 anos de planilha entram no sistema ou começa do
    zero?

## Ressalva

Este documento foi montado a partir de fotos de tela, não do arquivo original.
Nomes de coluna e valores foram lidos das imagens e podem conter erro de leitura —
em especial o significado das siglas `TOR`, `QUA`, `IQT` e `SLB`, que eu inferi
pelo contexto e não confirmei. Conferir contra o `.xlsx` quando ele chegar.

# VBT — Velocity Based Training

Nota de contexto pro time. Não é especificação: é a base conceitual do domínio,
pra todo mundo falar a mesma língua antes de modelar.

**Situação atual do cliente:** o acompanhamento é feito em planilhas de Excel.
O MVP existe pra resolver essa dor específica — não pra cobrir VBT inteiro.

> ⚠️ **Leia antes o [`planilha-atual.md`](planilha-atual.md).** Este documento aqui
> descreve VBT como método, de forma geral. O que o cliente realmente faz é um
> recorte bem menor: **avaliação periódica** (a cada 4–8 semanas), não
> acompanhamento repetição a repetição durante o treino. Onde os dois divergirem,
> vale o `planilha-atual.md` — ele foi escrito a partir do material real.

---

## A ideia central

No treino tradicional a intensidade é prescrita por **carga relativa** (%1RM) ou
por percepção de esforço (RPE). O problema: o 1RM oscila dia a dia (sono,
estresse, fadiga acumulada), então 80% no papel pode ser 85% real numa terça
ruim.

VBT troca isso por uma medida objetiva: a **velocidade da fase concêntrica** de
cada repetição, em m/s. Existe uma relação forte e razoavelmente estável entre
carga relativa e velocidade — quanto mais pesado, mais lento, de forma quase
linear. A velocidade vira um termômetro da intensidade real, medida no momento.

## Métricas

| Sigla | Nome | Quando se usa |
| --- | --- | --- |
| VMC | Velocidade média concêntrica | Padrão em levantamentos de força (agachamento, supino) |
| VMP | Velocidade média propulsiva | Média só até a aceleração cair abaixo da gravidade; relevante em cargas leves, onde há muita desaceleração no fim |
| VP | Velocidade de pico | Movimentos balísticos (saltos, derivados do olímpico) |

Secundárias: ROM (amplitude), potência média/pico, força estimada.

> **A métrica correta depende do exercício.** Isso é configuração por exercício,
> não constante global do sistema.

> ✅ **O cliente usa VMP.** As colunas da planilha são literalmente `VMP SJ_1`,
> `VMP_1`, `VMP_2`… Escola espanhola.

## As três aplicações práticas

### 1. Perfil carga-velocidade (LVP) e 1RM estimado

Faz-se um teste incremental (várias cargas crescentes, melhor rep de cada) e
ajusta-se uma reta `velocidade = a − b·carga`. Com essa reta estima-se o 1RM: é a
carga em que a velocidade cairia até o **MVT** (*minimum velocity threshold*) — a
velocidade da última repetição possível num máximo.

O MVT é bastante estável dentro de um mesmo atleta/exercício, mas varia entre
pessoas. Ordens de grandeza que circulam na literatura:

| Exercício | MVT aprox. |
| --- | --- |
| Agachamento | ~0,30 m/s |
| Supino | ~0,15 m/s |
| Levantamento terra | ~0,15 m/s |

> ⚠️ Valores iniciais, **configuráveis** — nunca fixos no código. Variam por
> estudo, por padrão de execução e por indivíduo, e é justamente o parâmetro que
> o treinador vai querer calibrar.

Ganho prático: estimar o 1RM do dia a partir do aquecimento, sem testar máximo.

### 2. Perda de velocidade como critério de parada

Encerra-se a série quando a velocidade cai X% em relação à repetição mais rápida.
É provavelmente o uso mais adotado na prática.

A pesquisa (Pareja-Blanco e colegas) aponta que cortes baixos (10–20%) preservam
potência e geram menos fadiga; cortes altos (40%+) puxam mais hipertrofia com
custo maior de recuperação.

Consequência: "4 séries" deixa de ser quantidade fixa e vira alvo de qualidade —
o número de reps da série é resultado, não prescrição.

### 3. Zonas de velocidade para prescrição

Faixas aproximadas (Bryan Mann), que variam por exercício:

| Qualidade | Faixa aprox. |
| --- | --- |
| Força absoluta | < 0,5 m/s |
| Força-velocidade | 0,5 – 0,75 m/s |
| Velocidade-força | 0,75 – 1,0 m/s |
| Velocidade | > 1,0 m/s |

A prescrição vira "5×3 mantendo 0,70–0,75 m/s, ajustando a carga pra ficar na
faixa".

### Bônus: feedback em tempo real

Ver o número na tela durante a série aumenta o desempenho — o atleta puxa com
mais intenção. É argumento de UX, não só de relatório.

## Como o dado entra

| Tipo | Exemplos | Observação |
| --- | --- | --- |
| Encoder linear | GymAware, Vitruve, Tendo, Speed4Lifts | Cabo preso à barra. Mais preciso, mais caro |
| IMU / acelerômetro | PUSH, Enode, Beast | Preso à barra ou ao punho |
| Óptico / câmera | Perch, Iron Path, MyLift | Inclui apps de celular |

> Dispositivos diferentes **não produzem números comparáveis entre si**. Se o app
> aceitar mais de uma fonte, precisa gravar de qual veio cada medição — senão o
> histórico do atleta fica inconsistente quando a academia trocar de aparelho.

## O que isso muda no modelo de dados

Aqui é onde a teoria geral e o caso do cliente se separam. Vale conhecer os dois.

### No VBT "cheio" (acompanhamento durante o treino)

**A unidade atômica passa a ser a repetição, não a série.**

Num app de academia comum, `série = carga × reps` resolve. Em VBT de treino cada
repetição precisa ser guardada individualmente (velocidade, carga, ROM, ordem),
porque perda de velocidade, rep mais rápida e LVP só existem no nível da rep.
Isso significa volume de dados uma ordem de grandeza maior, e agregações (rep
mais rápida da série, % de perda, 1RM estimado) que teriam que ser calculadas na
hora ou materializadas.

### No caso do cliente (avaliação periódica) — o que vale pro MVP

**A unidade atômica é a avaliação**, e dentro dela um punhado de pontos
`(carga, velocidade)`. Ver [`planilha-atual.md`](planilha-atual.md) para o
detalhe, mas em resumo:

- ~21 avaliações em 3 anos por atleta, a cada 4–8 semanas.
- Cada avaliação tem de 4 a 8 pontos de carga.
- Volume total irrisório (~170 medições por atleta em 3 anos).
- Sem ingestão em tempo real, sem integração ao vivo com encoder.

Ou seja: **é um app de avaliação e relatório, não de execução de treino.** Boa
parte da complexidade que eu antecipei acima simplesmente não se aplica.

Entidades que aparecem de qualquer forma:

- **Perfil carga-velocidade** por atleta × data (pontos medidos + coeficientes da
  reta + qualidade do ajuste).
- **Origem da medição** (dispositivo/fonte), se houver mais de uma.

## Ressalva

Este documento foi escrito a partir de conhecimento geral da literatura de VBT,
sem revisão de um profissional de educação física. A lógica do método é sólida,
mas os números específicos (MVT, limiares de zona) variam bastante entre estudos
e populações. Validar as constantes com quem vai usar, e mantê-las editáveis no
sistema em vez de fixas no código.

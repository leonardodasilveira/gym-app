# VBT — Velocity Based Training

Nota de contexto pro time. Não é especificação: é a base conceitual do domínio,
pra todo mundo falar a mesma língua antes de modelar.

**Situação atual do cliente:** o acompanhamento é feito em planilhas de Excel.
O MVP existe pra resolver essa dor específica — não pra cobrir VBT inteiro.

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

**A unidade atômica passa a ser a repetição, não a série.**

Num app de academia comum, `série = carga × reps` resolve. Em VBT cada repetição
precisa ser guardada individualmente (velocidade, carga, ROM, ordem), porque
perda de velocidade, rep mais rápida e LVP só existem no nível da rep. Isso
significa volume de dados uma ordem de grandeza maior, e agregações (rep mais
rápida da série, % de perda, 1RM estimado) que a gente vai ter que decidir se
calcula na hora ou materializa.

Entidades que não existem no app tradicional:

- **Perfil carga-velocidade** por atleta × exercício (data, coeficientes da reta,
  qualidade do ajuste).
- **MVT** por atleta × exercício.
- **Prescrição por alvo de velocidade / corte de perda**, em vez de carga fixa.
- **Origem da medição** (dispositivo/fonte) em cada repetição.

## Perguntas em aberto com o cliente

Estas mudam a arquitetura, não só a tela:

1. **Qual dispositivo?** Tem API, exporta CSV, ou o professor digita na mão?
   Define a arquitetura mais do que qualquer outra coisa.
2. **Tempo real ou pós-treino?** Feedback rep a rep durante a série é um app;
   importar a sessão depois é outro, bem mais simples.
3. **Quem é o usuário?** Painel do treinador, app do aluno, ou os dois?
4. **LVP/1RM estimado, ou só perda de velocidade?** O primeiro exige teste
   incremental e regressão; o segundo é mais direto e já entrega boa parte do
   valor. Pra um MVP que substitui planilha, começar pelo segundo é defensável.
5. **Individual ou turma?** Acompanhar 15 alunos simultâneos numa sala muda a UI
   inteira.
6. **Como é a planilha hoje?** Ver o Excel atual do cliente provavelmente responde
   metade das perguntas acima de graça.

## Ressalva

Este documento foi escrito a partir de conhecimento geral da literatura de VBT,
sem revisão de um profissional de educação física. A lógica do método é sólida,
mas os números específicos (MVT, limiares de zona) variam bastante entre estudos
e populações. Validar as constantes com quem vai usar, e mantê-las editáveis no
sistema em vez de fixas no código.

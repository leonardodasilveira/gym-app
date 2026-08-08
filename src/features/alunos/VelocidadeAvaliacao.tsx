import { VelocidadeTabelaAvaliacao } from "@/features/avaliacoes/VelocidadeTabelaAvaliacao";
import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { formatarData } from "@/features/shared/formato";

/**
 * Substitui o antigo `TestesAvaliacao`, que nao pode ser remapeado: o v1
 * guardava `testes[]` -> `tentativas[]` com ordem, repeticoes, carga e tempo,
 * e o v2 guarda um unico par carga/tempo por exercicio. Nao existe tentativa
 * nem repeticao no modelo novo, entao a tabela de tentativas nao tinha dado —
 * virou esta, com o que o bloco Velocidade de fato traz.
 *
 * A tabela em si (`VelocidadeTabelaAvaliacao`) e compartilhada com o detalhe
 * da avaliacao (E6); este componente cuida so do contexto proprio da ficha —
 * titulo, data e wrapper.
 */
export function VelocidadeAvaliacao({
  avaliacao,
}: {
  avaliacao: AvaliacaoCompleta;
}) {
  return (
    <section aria-labelledby="velocidade-heading" className="mt-8">
      <h2 id="velocidade-heading" className="text-lg font-semibold">
        Velocidade da avaliação mais recente
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatarData(avaliacao.dataAvaliacao)}
      </p>

      <div className="mt-3">
        <VelocidadeTabelaAvaliacao velocidade={avaliacao.velocidade} />
      </div>
    </section>
  );
}

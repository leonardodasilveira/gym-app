import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ValorOuAusente } from "@/components/ui/valor-ausente";
import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { formatarData, formatarNumeroOuTraco } from "@/features/shared/formato";
import { EXERCICIOS_VELOCIDADE } from "@/lib/medidas";

/**
 * Substitui o antigo `TestesAvaliacao`, que nao pode ser remapeado: o v1
 * guardava `testes[]` -> `tentativas[]` com ordem, repeticoes, carga e tempo,
 * e o v2 guarda um unico par carga/tempo por exercicio. Nao existe tentativa
 * nem repeticao no modelo novo, entao a tabela de tentativas nao tinha dado —
 * virou esta, com o que o bloco Velocidade de fato traz.
 *
 * Os dois exercicios sempre aparecem, mesmo sem medicao: o conjunto e fechado
 * pelo catalogo (`EXERCICIOS_VELOCIDADE`), e some-los faria a tabela mudar de
 * tamanho conforme o preenchimento — a mesma regra que o relatorio segue.
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
        <Table>
          <TableCaption className="sr-only">
            Carga e tempo por exercício do bloco Velocidade
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Exercício</TableHead>
              <TableHead scope="col" className="text-right">
                Carga (kg)
              </TableHead>
              <TableHead scope="col" className="text-right">
                Tempo (s)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EXERCICIOS_VELOCIDADE.map((exercicio) => {
              const medido = avaliacao.velocidade[exercicio.chave];

              return (
                <TableRow key={exercicio.chave}>
                  <TableHead scope="row" className="font-medium">
                    {exercicio.nome}
                  </TableHead>
                  <TableCell className="text-right">
                    <ValorOuAusente
                      valor={medido.cargaKg}
                      formatar={formatarNumeroOuTraco}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <ValorOuAusente
                      valor={medido.tempoSegundos}
                      formatar={formatarNumeroOuTraco}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

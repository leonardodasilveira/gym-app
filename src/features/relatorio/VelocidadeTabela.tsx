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
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { formatarNumeroOuTraco } from "@/features/shared/formato";

/**
 * Entrou no lugar da curva forca-velocidade. A diferenca nao e de layout: a
 * curva publicava uma velocidade DERIVADA de um deslocamento chutado, e aqui
 * sao carga e tempo como o professor digitou, sem nenhuma conta no meio.
 *
 * `velocidadeDetalhada` ja vem achatado do backend com o nome do exercicio
 * pronto (src/lib/relatorio.ts:94) — nao importar EXERCICIOS_VELOCIDADE aqui.
 *
 * Exercicio nao medido continua aparecendo com os dois valores vazios, mesma
 * regra das medidas: some-lo faria a tabela mudar de tamanho conforme o
 * preenchimento.
 */
export function VelocidadeTabela({
  velocidadeDetalhada,
}: {
  velocidadeDetalhada: RelatorioResponse["velocidadeDetalhada"];
}) {
  return (
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
        {velocidadeDetalhada.map((exercicio) => (
          <TableRow key={exercicio.codigo}>
            <TableHead scope="row" className="font-medium">
              {exercicio.nome}
            </TableHead>
            <TableCell className="text-right">
              <ValorOuAusente
                valor={exercicio.cargaKg}
                formatar={formatarNumeroOuTraco}
              />
            </TableCell>
            <TableCell className="text-right">
              <ValorOuAusente
                valor={exercicio.tempoSegundos}
                formatar={formatarNumeroOuTraco}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

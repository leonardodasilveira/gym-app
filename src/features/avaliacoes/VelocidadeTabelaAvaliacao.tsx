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
import { formatarNumeroOuTraco } from "@/features/shared/formato";
import { EXERCICIOS_VELOCIDADE } from "@/lib/medidas";

/**
 * So a representacao da tabela `Exercício | Carga (kg) | Tempo (s)`,
 * extraida de features/alunos/VelocidadeAvaliacao.tsx pra ser compartilhada
 * com o detalhe da avaliacao (E6). O contexto de quem consome — titulo,
 * data, wrapper — fica com cada chamador; este componente so sabe ler o
 * bloco `velocidade`.
 *
 * Os dois exercicios sempre aparecem, mesmo sem medicao: o conjunto e
 * fechado pelo catalogo (`EXERCICIOS_VELOCIDADE`), e some-los faria a
 * tabela mudar de tamanho conforme o preenchimento.
 */
export function VelocidadeTabelaAvaliacao({
  velocidade,
}: {
  velocidade: AvaliacaoCompleta["velocidade"];
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
        {EXERCICIOS_VELOCIDADE.map((exercicio) => {
          const medido = velocidade[exercicio.chave];

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
  );
}

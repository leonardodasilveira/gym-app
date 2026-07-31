import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AvaliacaoCompleta } from "@/features/alunos/tipos";
import { formatarData, formatarNumeroOuTraco } from "@/features/shared/formato";

export function TestesAvaliacao({
  avaliacao,
}: {
  avaliacao: AvaliacaoCompleta;
}) {
  return (
    <section aria-labelledby="testes-heading" className="mt-8">
      <h2 id="testes-heading" className="text-lg font-semibold">
        Testes da avaliação mais recente
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatarData(avaliacao.dataAvaliacao)}
      </p>

      {avaliacao.testes.length === 0 ? (
        <div className="mt-3">
          <EmptyState titulo="Nenhum teste registrado nesta avaliação" />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-6">
          {avaliacao.testes.map((teste) => (
            <div key={teste.codigo}>
              <h3 className="text-base font-medium">{teste.nome}</h3>
              <div className="mt-2">
                <Table>
                  <TableCaption className="sr-only">
                    Tentativas do teste {teste.nome}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Ordem</TableHead>
                      <TableHead scope="col" className="text-right">
                        Repetições
                      </TableHead>
                      <TableHead scope="col" className="text-right">
                        Carga (kg)
                      </TableHead>
                      <TableHead scope="col" className="text-right">
                        Tempo (s)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teste.tentativas.map((tentativa) => (
                      <TableRow key={tentativa.ordem}>
                        <TableHead scope="row" className="font-medium">
                          {tentativa.ordem}
                        </TableHead>
                        <TableCell className="text-right">
                          {tentativa.repeticoes}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatarNumeroOuTraco(tentativa.carga.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatarNumeroOuTraco(tentativa.tempo.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

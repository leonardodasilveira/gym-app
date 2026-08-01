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
import type { RelatorioResponse } from "@/features/relatorio/tipos";
import {
  formatarData,
  formatarDeltaOuTraco,
  formatarNumeroOuTraco,
} from "@/features/shared/formato";

/**
 * `resumoCmj.atual` e o CMJ mais recente do HISTORICO do aluno, nao da
 * avaliacao relatada (podem divergir — spec 3.6/5.6). Rotulo obrigatorio:
 * "Mais recente do histórico", nunca "Atual".
 */
export function ResumoCmj({
  resumoCmj,
}: {
  resumoCmj: RelatorioResponse["resumoCmj"];
}) {
  if (resumoCmj === null) {
    return <EmptyState titulo="Nenhum CMJ registrado para este aluno" />;
  }

  const linhas = [
    { rotulo: "Inicial", ponto: resumoCmj.inicial },
    { rotulo: "Pico", ponto: resumoCmj.pico },
    { rotulo: "Mais recente do histórico", ponto: resumoCmj.atual },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableCaption className="sr-only">
          Resumo do CMJ ao longo do histórico
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Marco</TableHead>
            <TableHead scope="col">Data</TableHead>
            <TableHead scope="col" className="text-right">
              CMJ (cm)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow key={linha.rotulo}>
              <TableHead scope="row" className="font-medium">
                {linha.rotulo}
              </TableHead>
              <TableCell>{formatarData(linha.ponto.data)}</TableCell>
              <TableCell className="text-right">
                {formatarNumeroOuTraco(linha.ponto.valor)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">
            Variação vs. inicial
          </dt>
          <dd className="text-base font-medium">
            {formatarDeltaOuTraco(resumoCmj.variacaoVsInicial)} cm
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Variação vs. pico</dt>
          <dd className="text-base font-medium">
            {formatarDeltaOuTraco(resumoCmj.variacaoVsPico)} cm
          </dd>
        </div>
      </dl>
    </div>
  );
}

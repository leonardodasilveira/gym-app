import type { RelatorioResponse } from "@/features/relatorio/tipos";
import { formatarData } from "@/features/shared/formato";

/**
 * O periodo/historico cobrem o aluno inteiro, nao a avaliacao relatada —
 * por isso a avaliacao de referencia e destacada primeiro, e a linha de
 * periodo usa os rotulos exigidos pela spec (nunca "atual"/"total").
 */
export function RelatorioCabecalho({
  aluno,
  avaliacao,
  periodo,
}: {
  aluno: RelatorioResponse["aluno"];
  avaliacao: RelatorioResponse["avaliacao"];
  periodo: RelatorioResponse["periodo"];
}) {
  return (
    <header>
      <h1 className="break-words text-2xl font-semibold tracking-tight">
        Relatório de performance
      </h1>
      <p className="mt-2 text-base font-medium">
        {aluno.nome}
        <span className="font-normal text-muted-foreground">
          {" "}
          · avaliação de referência: {formatarData(avaliacao.dataAvaliacao)}
        </span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Histórico do aluno: {formatarData(periodo.de)} até o último registro
        do histórico ({formatarData(periodo.ate)}) · {periodo.totalAvaliacoes}{" "}
        avaliações com CMJ no período
      </p>
      {avaliacao.observacoes !== null ? (
        <p className="mt-3 text-sm">{avaliacao.observacoes}</p>
      ) : null}
    </header>
  );
}

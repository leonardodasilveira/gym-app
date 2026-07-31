import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AlunoDetalhe } from "@/features/alunos/tipos";
import { calcularIdade, formatarData } from "@/features/shared/formato";

export function AlunoCabecalho({
  aluno,
  totalAvaliacoes,
  dataMaisRecente,
}: {
  aluno: AlunoDetalhe;
  totalAvaliacoes: number;
  dataMaisRecente: string | null;
}) {
  const idade = aluno.dataNascimento
    ? calcularIdade(aluno.dataNascimento)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="break-words text-2xl font-semibold tracking-tight">
          {aluno.nome}
        </h1>
        <Badge variant={aluno.ativo ? "default" : "secondary"}>
          {aluno.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <section aria-labelledby="resumo-heading">
        <h2 id="resumo-heading" className="text-lg font-semibold">
          Resumo
        </h2>
        <Card className="mt-3">
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {idade !== null ? (
                <div>
                  <dt className="text-sm text-muted-foreground">Idade</dt>
                  <dd className="text-base font-medium">
                    {idade} {idade === 1 ? "ano" : "anos"}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm text-muted-foreground">
                  Total de avaliações
                </dt>
                <dd className="text-base font-medium">{totalAvaliacoes}</dd>
              </div>
              {dataMaisRecente !== null ? (
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Avaliação mais recente
                  </dt>
                  <dd className="text-base font-medium">
                    {formatarData(dataMaisRecente)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

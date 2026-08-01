"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { alternarAtivo } from "@/features/alunos/acoes";
import { mensagemDoErro } from "@/features/shared/erros";

type AcoesAlunoProps = {
  aluno: { id: string; nome: string; ativo: boolean };
};

/**
 * Barra de ações da ficha: editar e inativar/reativar
 * (e4-implementation-spec.md 9). Excluir chega na U4.
 */
export function AcoesAluno({ aluno }: AcoesAlunoProps) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarStatus() {
    setPendente(true);
    setErro(null);

    const resultado = await alternarAtivo(aluno.id, !aluno.ativo);

    if (!resultado.ok) {
      setErro(mensagemDoErro(resultado.erro.status));
      setPendente(false);
      return;
    }

    router.refresh();
    setPendente(false);
  }

  const rotulo = aluno.ativo ? "Inativar aluno" : "Reativar aluno";
  const rotuloPendente = aluno.ativo ? "Inativando…" : "Reativando…";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="h-11 sm:h-9"
          render={<Link href={`/alunos/${aluno.id}/editar`}>Editar aluno</Link>}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:h-9"
          disabled={pendente}
          onClick={alternarStatus}
        >
          {pendente ? rotuloPendente : rotulo}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {`Um aluno inativo continua no sistema, com avaliações e relatório intactos — some apenas do filtro "Ativos".`}
      </p>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-foreground">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

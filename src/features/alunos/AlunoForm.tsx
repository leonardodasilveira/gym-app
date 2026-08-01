"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CampoFormulario } from "@/components/ui/campo-formulario";
import { atualizarAluno, criarAluno } from "@/features/alunos/acoes";
import type { EstadoAluno } from "@/features/alunos/tipos";
import { normalizarTexto } from "@/features/alunos/utils";

const ESTADO_INICIAL: EstadoAluno = { status: "inicial" };

const AVISO_DATA = "Opcional. Usada para calcular a idade no relatório.";

type AlunoFormProps = {
  modo: "criar" | "editar";
  aluno: { id: string; nome: string; dataNascimento: string | null; ativo: boolean } | null;
  nomesExistentes: { id: string; nome: string }[];
};

function mensagemDuplicidade(
  nome: string,
  proprioId: string | null,
  nomesExistentes: { id: string; nome: string }[],
): string | null {
  const nomeNormalizado = normalizarTexto(nome);
  if (!nomeNormalizado) return null;

  const encontrado = nomesExistentes.find(
    (existente) =>
      existente.id !== proprioId && normalizarTexto(existente.nome) === nomeNormalizado,
  );

  return encontrado
    ? `Já existe um aluno chamado "${encontrado.nome}". Você pode continuar se forem pessoas diferentes.`
    : null;
}

/**
 * Formulario compartilhado entre criar e editar (e4-implementation-spec.md
 * 12.2): mesma forma, ação/schema/destino diferentes conforme `modo`.
 */
export function AlunoForm({ modo, aluno, nomesExistentes }: AlunoFormProps) {
  const router = useRouter();

  const acao =
    modo === "criar"
      ? criarAluno
      : atualizarAluno.bind(null, {
          id: aluno!.id,
          dataNascimento: aluno!.dataNascimento,
        });

  const [estado, dispatch, pendente] = useActionState(acao, ESTADO_INICIAL);

  const [avisoDuplicidade, setAvisoDuplicidade] = useState<string | null>(null);

  // Guarda contra duplo submit alem do `disabled` (e4-implementation-spec.md
  // 16): um segundo clique antes do re-render que desabilita o botao nao
  // dispara uma segunda requisicao.
  const emAndamentoRef = useRef(false);

  useEffect(() => {
    if (!pendente) emAndamentoRef.current = false;
  }, [pendente]);

  const valores =
    estado.status === "erro"
      ? estado.valores
      : { nome: aluno?.nome ?? "", dataNascimento: aluno?.dataNascimento ?? "" };

  const errosPorCampo = estado.status === "erro" ? estado.errosPorCampo : {};
  const mensagemGeral = estado.status === "erro" ? estado.mensagem : null;
  const errosDeCampo = Object.entries(errosPorCampo) as [string, string][];
  const mostrarResumo = errosDeCampo.length > 1 || mensagemGeral !== null;

  useEffect(() => {
    if (estado.status !== "erro") return;
    const idAlvo = estado.errosPorCampo.nome
      ? "nome"
      : estado.errosPorCampo.dataNascimento
        ? "dataNascimento"
        : null;
    if (idAlvo) document.getElementById(idAlvo)?.focus();
  }, [estado]);

  useEffect(() => {
    if (estado.status !== "sucesso") return;
    const destino = modo === "criar" ? "/alunos" : `/alunos/${estado.id}`;
    router.refresh();
    router.push(destino);
  }, [estado, modo, router]);

  function verificarDuplicidade(nome: string) {
    setAvisoDuplicidade(mensagemDuplicidade(nome, aluno?.id ?? null, nomesExistentes));
  }

  const origem = aluno ? `/alunos/${aluno.id}` : "/alunos";
  const idAvisoDuplicidade = avisoDuplicidade ? "nome-duplicidade" : undefined;

  return (
    <form
      action={dispatch}
      onSubmit={(evento) => {
        if (emAndamentoRef.current) {
          evento.preventDefault();
          return;
        }
        emAndamentoRef.current = true;
        const nomeAtual = new FormData(evento.currentTarget).get("nome");
        verificarDuplicidade(String(nomeAtual ?? ""));
      }}
      className="mt-6 flex flex-col gap-6"
    >
      {mostrarResumo ? (
        <div role="alert" className="rounded-lg border border-current px-4 py-3 text-sm">
          <p className="font-semibold">Corrija os itens abaixo:</p>
          <ul className="mt-1 list-disc pl-5">
            {mensagemGeral ? <li>{mensagemGeral}</li> : null}
            {errosDeCampo.map(([campo, mensagem]) => (
              <li key={campo}>{mensagem}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">* campo obrigatório</p>

      <div className="flex flex-col gap-4">
        <CampoFormulario
          id="nome"
          label="Nome"
          obrigatorio
          minLength={2}
          defaultValue={valores.nome}
          erro={errosPorCampo.nome ?? null}
          idsDescricaoExtra={idAvisoDuplicidade ? [idAvisoDuplicidade] : undefined}
          onBlur={(evento) => verificarDuplicidade(evento.target.value)}
        />
        {avisoDuplicidade ? (
          <p id={idAvisoDuplicidade} aria-live="polite" className="text-sm">
            {avisoDuplicidade}
          </p>
        ) : null}

        <CampoFormulario
          id="dataNascimento"
          label="Data de nascimento"
          type="date"
          defaultValue={valores.dataNascimento}
          apoio={AVISO_DATA}
          erro={errosPorCampo.dataNascimento ?? null}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="submit" disabled={pendente} className="h-11 sm:h-9">
          {pendente ? "Salvando…" : modo === "criar" ? "Salvar aluno" : "Salvar alterações"}
        </Button>
        <Button
          variant="outline"
          className="h-11 sm:h-9"
          render={<Link href={origem}>Cancelar</Link>}
        />
      </div>
    </form>
  );
}

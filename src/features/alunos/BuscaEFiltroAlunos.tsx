"use client";

import { useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { AlunosTabela } from "@/features/alunos/AlunosTabela";
import type { AlunoResumo, StatusFiltro } from "@/features/alunos/tipos";
import { filtrarAlunos } from "@/features/alunos/utils";

const OPCOES_STATUS: { valor: StatusFiltro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "ativo", rotulo: "Ativos" },
  { valor: "inativo", rotulo: "Inativos" },
];

/**
 * Atualiza um unico parametro na URL via history.replaceState, sem passar
 * pelo roteador do Next — nenhuma navegacao, nenhuma nova requisicao.
 * Preserva os demais parametros e o hash existentes.
 */
function atualizarParametro(chave: "q" | "status", valor: string) {
  const params = new URLSearchParams(window.location.search);

  if (valor) {
    params.set(chave, valor);
  } else {
    params.delete(chave);
  }

  const query = params.toString();
  const url = `/alunos${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);
}

export function BuscaEFiltroAlunos({
  alunos,
  buscaInicial,
  statusInicial,
}: {
  alunos: AlunoResumo[];
  buscaInicial: string;
  statusInicial: StatusFiltro;
}) {
  const [busca, setBusca] = useState(buscaInicial);
  const [status, setStatus] = useState<StatusFiltro>(statusInicial);

  function aoAlterarBusca(evento: ChangeEvent<HTMLInputElement>) {
    const valor = evento.target.value;
    setBusca(valor);
    atualizarParametro("q", valor.trim());
  }

  function aoSelecionarStatus(valor: StatusFiltro) {
    setStatus(valor);
    atualizarParametro("status", valor === "todos" ? "" : valor);
  }

  const filtrados = filtrarAlunos(alunos, busca, status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Buscar por nome"
          value={busca}
          onChange={aoAlterarBusca}
          aria-label="Buscar aluno por nome"
          className="sm:max-w-xs"
        />
        <div
          role="group"
          aria-label="Filtrar por status"
          className="flex gap-2"
        >
          {OPCOES_STATUS.map((opcao) => (
            <Button
              key={opcao.valor}
              type="button"
              variant={status === opcao.valor ? "default" : "outline"}
              size="sm"
              onClick={() => aoSelecionarStatus(opcao.valor)}
            >
              {opcao.rotulo}
            </Button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          titulo="Nenhum resultado encontrado"
          descricao={
            busca.trim()
              ? `Não encontramos alunos para "${busca.trim()}".`
              : "Ajuste os filtros e tente novamente."
          }
        />
      ) : (
        <AlunosTabela alunos={filtrados} />
      )}
    </div>
  );
}

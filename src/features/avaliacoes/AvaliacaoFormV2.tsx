"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CampoFormulario } from "@/components/ui/campo-formulario";
import { cn } from "@/components/utils";
import { criarAvaliacaoV2 } from "./acoes";
import { AvisoFormularioProvisorio } from "./AvisoFormularioProvisorio";
import { AmplitudeFieldset } from "./AmplitudeFieldset";
import { SaltosFieldset } from "./SaltosFieldset";
import { VelocidadeFieldset } from "./VelocidadeFieldset";
import { formDataParaValoresV2 } from "./mappers";
import type { ReferenciaAnteriorV2 } from "./mappers";
import { gravarRascunho, lerRascunho, limparRascunho, type Rascunho } from "./rascunho";
import type { EstadoAvaliacaoV2, ValoresAvaliacaoV2 } from "./tipos";

const INICIAL: EstadoAvaliacaoV2 = { status: "inicial" };
type Props = { alunoId: string; alunoNome: string; alunoAtivo: boolean; referencia: ReferenciaAnteriorV2 | null; dataPadrao: string };

export function AvaliacaoFormV2({ alunoId, alunoNome, alunoAtivo, referencia, dataPadrao }: Props) {
  const acao = criarAvaliacaoV2.bind(null, { alunoId });
  const [estado, dispatch, pendente] = useActionState(acao, INICIAL);
  const formRef = useRef<HTMLFormElement>(null); const emAndamentoRef = useRef(false); const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setRascunho(lerRascunho(alunoId)), 0);
    return () => window.clearTimeout(timer);
  }, [alunoId]);
  useEffect(() => { if (!pendente) emAndamentoRef.current = false; }, [pendente]);
  useEffect(() => { if (estado.status !== "erro") return; formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [estado]);
  useEffect(() => { if (estado.status === "sucesso") limparRascunho(alunoId); }, [estado, alunoId]);
  const valores = estado.status === "erro" || estado.status === "pendente-integracao" ? estado.valores : { dataAvaliacao: dataPadrao, observacoes: "", campos: {} };
  const erros = estado.status === "erro" ? estado.errosPorCampo : {}; const mensagem = estado.status === "erro" ? estado.mensagem : null; const entradasErro = Object.entries(erros); const mostrarResumo = entradasErro.length > 1 || mensagem !== null;
  function aplicar(valoresAplicados: ValoresAvaliacaoV2) { const form = formRef.current; if (!form) return; for (const [nome, valor] of [["dataAvaliacao", valoresAplicados.dataAvaliacao], ["observacoes", valoresAplicados.observacoes], ...Object.entries(valoresAplicados.campos)]) { const campo = form.elements.namedItem(nome); if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) campo.value = valor; } }
  return <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"><Link href={`/alunos/${alunoId}`} className="text-sm underline-offset-4 hover:underline">← Voltar</Link><div className="mt-4 flex items-center gap-2"><h1 className="text-2xl font-semibold">Nova avaliação</h1>{!alunoAtivo ? <Badge variant="outline">Inativo</Badge> : null}</div><p className="mt-1 text-muted-foreground">{alunoNome}</p><div className="mt-6"><AvisoFormularioProvisorio /></div>
    <form ref={formRef} action={dispatch} className="mt-4 flex flex-col gap-6" onInput={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (formRef.current) gravarRascunho(alunoId, formDataParaValoresV2(new FormData(formRef.current))); }, 800); }} onSubmit={(e) => { if (emAndamentoRef.current) e.preventDefault(); else emAndamentoRef.current = true; }}>
      {rascunho ? <section className="rounded-lg border p-4"><p className="font-semibold">Rascunho encontrado</p><div className="mt-2 flex gap-2"><Button type="button" className="h-11 sm:h-9" onClick={() => { aplicar(rascunho.valores); setRascunho(null); }}>Restaurar</Button><Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => { limparRascunho(alunoId); setRascunho(null); }}>Descartar</Button></div></section> : null}
      {mostrarResumo ? <div role="alert" className="rounded-lg border border-current p-4 text-sm"><p className="font-semibold">Corrija os itens abaixo:</p><ul className="list-disc pl-5">{mensagem ? <li>{mensagem}</li> : null}{entradasErro.map(([campo, erro]) => <li key={campo}>{erro}</li>)}</ul></div> : null}
      {estado.status === "pendente-integracao" ? <div role="status" className="rounded-lg border p-4"><p className="font-semibold">Preenchimento validado</p><p className="mt-1 text-sm">{estado.mensagem}</p></div> : null}
      <fieldset className="rounded-lg border p-4"><legend className="px-2 font-semibold">Data e observações</legend><div className="grid gap-4"><CampoFormulario id="dataAvaliacao" label="Data da avaliação" type="date" obrigatorio defaultValue={valores.dataAvaliacao} erro={erros.dataAvaliacao} /><div><label htmlFor="observacoes" className="text-sm font-medium">Observações</label><textarea id="observacoes" name="observacoes" defaultValue={valores.observacoes} className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2" /></div></div></fieldset>
      <AmplitudeFieldset referencia={referencia} erros={erros} valores={valores.campos} />
      <SaltosFieldset referencia={referencia} erros={erros} valores={valores.campos} />
      <VelocidadeFieldset erros={erros} valores={valores.campos} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="submit" disabled={pendente} className="h-11 sm:h-9">{pendente ? "Validando…" : "Validar preenchimento"}</Button><Link href={`/alunos/${alunoId}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>Cancelar</Link></div>
    </form></main>;
}

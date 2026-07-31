import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AlunoResumo } from "@/features/alunos/tipos";

export function AlunosTabela({ alunos }: { alunos: AlunoResumo[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">Lista de alunos</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Nome</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" className="text-right">
            Avaliações
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alunos.map((aluno) => (
          <TableRow key={aluno.id}>
            <TableCell className="whitespace-normal break-words font-medium">
              <Link
                href={`/alunos/${aluno.id}`}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                {aluno.nome}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={aluno.ativo ? "default" : "secondary"}>
                {aluno.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {aluno.totalAvaliacoes}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

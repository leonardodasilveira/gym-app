"use client";

import { Button } from "@/components/ui/button";

/**
 * Unico Client Component do relatorio: so por causa do onClick. Sem props,
 * sem estado, sem dado do relatorio — nao precisa de nenhum.
 */
export function AcaoImprimir() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      Imprimir / Salvar PDF
    </Button>
  );
}

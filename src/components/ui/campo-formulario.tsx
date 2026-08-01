import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/components/utils";

type CampoFormularioProps = {
  id: string;
  label: string;
  obrigatorio?: boolean;
  apoio?: string;
  erro?: string | null;
} & Omit<ComponentProps<typeof Input>, "id" | "aria-describedby" | "aria-invalid">;

/**
 * label + Input + apoio + erro, com `aria-describedby` somando os ids que
 * existirem. Erro nunca depende só de cor: `aria-invalid`, peso de fonte e
 * prefixo textual (e4-implementation-spec.md 14.2/15).
 */
function CampoFormulario({
  id,
  label,
  obrigatorio,
  apoio,
  erro,
  name,
  className,
  ...props
}: CampoFormularioProps) {
  const apoioId = apoio ? `${id}-apoio` : undefined;
  const erroId = erro ? `${id}-erro` : undefined;
  const describedBy = [apoioId, erroId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {obrigatorio ? " *" : null}
      </label>
      <Input
        id={id}
        name={name ?? id}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {apoio ? (
        <p id={apoioId} className="text-sm text-muted-foreground">
          {apoio}
        </p>
      ) : null}
      {erro ? (
        <p id={erroId} className="text-sm font-semibold text-foreground">
          Erro: {erro}
        </p>
      ) : null}
    </div>
  );
}

export { CampoFormulario };

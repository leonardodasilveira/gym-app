import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/components/utils"

// Diverge do registro: --ring/--border ainda nao existem (tokens da Nova
// pendentes, ver frontend-plan.md 0.4), entao o anel de foco do proprio
// registro fica invisivel. focus-visible:outline-current e um fallback
// independente de tema, so enquanto isso — reavaliar quando os tokens
// oficiais chegarem. As classes de ring originais ficam, para o tema
// assumir o foco sozinho depois.
//
// focus-visible:outline-solid (E4): `outline-none` acima fixa
// --tw-outline-style:none, e focus-visible:outline-2 le essa mesma variavel
// via var(--tw-outline-style) — sem isto, o outline nunca aparece, mesmo com
// largura e cor definidas (diagnostico fechado em e4-implementation-spec.md 2.7).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-current disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

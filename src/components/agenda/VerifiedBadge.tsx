import { BadgeCheck } from 'lucide-react'

// Marca de "negocio certificado" estilo redes sociales (check azul)
export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Negocio certificado"
      className={`h-4 w-4 shrink-0 fill-blue-500 text-white ${className}`}
    />
  )
}

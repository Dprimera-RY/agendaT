'use client'

import { useRef, useState } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// Campo de imagen con subida de archivo al servidor.
// - businessId + slot (logo|img1|img2|img3): la subida sobreescribe la foto
//   anterior de ese slot (máximo 4 fotos por tienda).
// - sin businessId: subida con nombre aleatorio (antes de crear el negocio).
export function ImageField({
  label,
  value,
  onChange,
  businessId,
  slot,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  businessId?: string
  slot?: 'logo' | 'img1' | 'img2' | 'img3'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (businessId) fd.append('businessId', businessId)
      if (slot) fd.append('slot', slot)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange(data.url)
      toast.success('Imagen subida')
    } catch (e: any) {
      toast.error(e.message || 'Error al subir la imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
          </Button>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="O pega una URL"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  )
}

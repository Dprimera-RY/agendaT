'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Image as ImageIcon, Check, RotateCcw, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

// Editor breve de imagen: recorte cuadrado con zoom + arrastre y preview
// de cómo se verá en la página, ANTES de subir el archivo.
const CANVAS_SIZE = 640

function ImageEditorDialog({
  file,
  onCancel,
  onConfirm,
  onSkip,
}: {
  file: File | null
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  onSkip: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setImg(image)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      onCancel()
    }
    image.src = url
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Limita el desplazamiento para que el recorte siempre cubra el cuadro
  const clamp = useCallback(
    (o: { x: number; y: number }, z: number) => {
      if (!img) return o
      const S = CANVAS_SIZE
      const base = Math.max(S / img.width, S / img.height)
      const w = img.width * base * z
      const h = img.height * base * z
      const maxX = Math.max(0, (w - S) / 2)
      const maxY = Math.max(0, (h - S) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      }
    },
    [img]
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const S = canvas.width
    ctx.fillStyle = '#f4f4f5'
    ctx.fillRect(0, 0, S, S)
    const base = Math.max(S / img.width, S / img.height)
    const scale = base * zoom
    const w = img.width * scale
    const h = img.height * scale
    const x = (S - w) / 2 + offset.x
    const y = (S - h) / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
  }, [img, zoom, offset])

  useEffect(() => {
    draw()
  }, [draw])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current
    if (!d) return
    setOffset(
      clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, zoom)
    )
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const reset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onErrorFallback()
          return
        }
        onConfirm(blob)
      },
      'image/jpeg',
      0.92
    )
  }

  const onErrorFallback = () => {
    toast.error('No se pudo procesar la imagen')
    onSkip()
  }

  if (!file) return null

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onCancel()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Ajustar imagen
          </DialogTitle>
          <DialogDescription>
            Arrastra la imagen para recortar y usa el zoom. Así se verá en tu página pública.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full aspect-square rounded-xl border bg-muted/30 touch-none cursor-move select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => {
                const z = Number(e.target.value)
                setZoom(z)
                setOffset((o) => clamp(o, z))
              }}
              className="flex-1 accent-primary"
              aria-label="Zoom"
            />
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={onSkip}>
            Subir original
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="h-4 w-4 mr-1" />Aplicar y subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Campo de imagen con subida de archivo al servidor.
// - businessId + slot (logo|img1|img2|img3): la subida sobreescribe la foto
//   anterior de ese slot (máximo 4 fotos por tienda).
// - sin businessId: subida con nombre aleatorio (antes de crear el negocio).
// - Antes de subir abre un editor breve (recorte + zoom) con preview del resultado.
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
  const [editFile, setEditFile] = useState<File | null>(null)

  const doUpload = async (file: File) => {
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

  const handleFile = (file: File) => {
    setEditFile(file)
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
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
          <p className="text-[11px] text-muted-foreground">
            Podrás ajustarla (recorte y zoom) antes de subirla.
          </p>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="O pega una URL"
            className="text-xs"
          />
        </div>
      </div>

      <ImageEditorDialog
        file={editFile}
        onCancel={() => setEditFile(null)}
        onConfirm={(blob) => {
          const name = (editFile?.name || 'imagen').replace(/\.\w+$/, '') + '.jpg'
          const f = new File([blob], name, { type: 'image/jpeg' })
          setEditFile(null)
          doUpload(f)
        }}
        onSkip={() => {
          const f = editFile
          setEditFile(null)
          if (f) doUpload(f)
        }}
      />
    </div>
  )
}

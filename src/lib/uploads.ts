import path from 'path'

// Directorio de imágenes subidas, en la RAÍZ del proyecto (no en public/).
// En dev, cwd = raíz del proyecto → <raíz>/uploads.
// En producción standalone, server.js corre con cwd = next-service-dist →
// next-service-dist/uploads (empaquetado por build.sh y escribible en runtime).
// Los archivos de public/uploads (imágenes antiguas) siguen sirviéndose por el
// servidor estático de Next; esta ruta solo atiende los que no están ahí.
export function uploadsDir(): string {
  return path.join(process.cwd(), 'uploads')
}

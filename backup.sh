#!/bin/bash
# Salva de seguridad: base de datos SQLite + imágenes subidas (uploads/)
# Uso: bash backup.sh [directorio_destino]
# Por defecto guarda en ./backups con timestamp.

set -e
cd "$(dirname "$0")"

STAMP=$(date +%Y%m%d_%H%M%S)
DEST="${1:-backups/salva_$STAMP}"

mkdir -p "$DEST"

echo "💾 Creando salva en $DEST ..."

# Base de datos
if [ -f "db/custom.db" ]; then
  cp db/custom.db "$DEST/custom.db"
  echo "  ✅ db/custom.db ($(du -h db/custom.db | cut -f1))"
else
  echo "  ⚠️  db/custom.db no existe, se omite"
fi

# Imágenes subidas (runtime)
if [ -d "uploads" ]; then
  cp -r uploads "$DEST/uploads"
  echo "  ✅ uploads/ ($(du -sh uploads | cut -f1))"
else
  echo "  ⚠️  uploads/ no existe, se omite"
fi

# Lista de archivos para verificación
(cd "$DEST" && find . -type f | sort > MANIFEST.txt)

echo ""
echo "✅ Salva completada: $DEST"
echo "   Archivos: $(wc -l < "$DEST/MANIFEST.txt")"
echo ""
echo "Para restaurar: bash restore.sh"

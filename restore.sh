#!/bin/bash
# Restaura una salva creada con backup.sh
# Uso: bash restore.sh
# Muestra las salvas disponibles y pide confirmación antes de sobreescribir.

set -e
cd "$(dirname "$0")"

BACKUP_DIR="backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ No existe el directorio $BACKUP_DIR/"
  exit 1
fi

# Listar salvas disponibles
echo "📋 Salvas disponibles:"
echo ""

mapfile -t SALVAS < <(ls -1d "$BACKUP_DIR"/salva_* 2>/dev/null | sort -r)

if [ ${#SALVAS[@]} -eq 0 ]; then
  echo "   (ninguna salva encontrada en $BACKUP_DIR/)"
  exit 1
fi

for i in "${!SALVAS[@]}"; do
  s="${SALVAS[$i]}"
  name=$(basename "$s")
  db_size="-"
  up_count="-"
  [ -f "$s/custom.db" ] && db_size=$(du -h "$s/custom.db" | cut -f1)
  [ -d "$s/uploads" ] && up_count=$(find "$s/uploads" -type f | wc -l)
  echo "  [$((i+1))] $name  (db: $db_size, imágenes: $up_count)"
done

echo ""
read -p "¿Qué salva quieres restaurar? (número, o 'q' para salir): " choice

if [ "$choice" = "q" ] || [ -z "$choice" ]; then
  echo "Cancelado."
  exit 0
fi

idx=$((choice-1))
if [ $idx -lt 0 ] || [ $idx -ge ${#SALVAS[@]} ]; then
  echo "❌ Opción inválida"
  exit 1
fi

SALVA="${SALVAS[$idx]}"
echo ""
echo "⚠️  Vas a restaurar: $(basename "$SALVA")"
echo "   Esto SOBREESCRIBIRÁ:"
[ -f "$SALVA/custom.db" ] && echo "   - db/custom.db (base de datos actual)"
[ -d "$SALVA/uploads" ] && echo "   - uploads/ (imágenes actuales)"
echo ""
read -p "¿Continuar? (s/N): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
  echo "Cancelado."
  exit 0
fi

# Restaurar DB
if [ -f "$SALVA/custom.db" ]; then
  mkdir -p db
  cp "$SALVA/custom.db" db/custom.db
  echo "  ✅ db/custom.db restaurada"
fi

# Restaurar uploads
if [ -d "$SALVA/uploads" ]; then
  rm -rf uploads
  cp -r "$SALVA/uploads" uploads
  echo "  ✅ uploads/ restaurado ($(find uploads -type f | wc -l) archivos)"
fi

echo ""
echo "✅ Restauración completada desde $(basename "$SALVA")"
echo "   Reinicia el servidor para que los cambios tomen efecto."

#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/nginx.crt"
KEY_FILE="$CERT_DIR/nginx.key"

# Solo generamos el certificado si todavía no existe: así no se
# regenera en cada reinicio del contenedor, solo la primera vez
# en cada máquina de desarrollo
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "No se encontró el certificado, generando uno nuevo (self-signed)..."
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/C=ES/ST=Catalonia/L=Barcelona/O=42/CN=localhost"
    echo "Certificado generado en $CERT_DIR"
else
    echo "Certificado ya existente, se reutiliza."
fi

# exec reemplaza este proceso shell por nginx: así nginx recibe
# correctamente las señales del sistema (SIGTERM, etc.) para un
# apagado limpio del contenedor
exec nginx -g "daemon off;"

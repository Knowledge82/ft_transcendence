# --- Etapa de desarrollo ---
FROM node:20-alpine AS development

WORKDIR /app

# Prisma necesita OpenSSL para el motor de consultas (query engine);
# node:20-alpine no lo trae instalado por defecto
RUN apk add --no-cache openssl

# Copiamos primero solo package.json: así Docker cachea la instalación
# de dependencias en una capa separada y no la repite en cada cambio
# de código fuente
COPY package*.json ./

RUN npm install

# El CLI de Prisma genera el cliente a partir de schema.prisma — necesario dentro del contenedor
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# El entrypoint aplica las migraciones de Prisma antes de arrancar la app
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# --watch activa el hot-reload: NestJS reinicia el proceso automáticamente al detectar cambios,
# el volumen definido en docker-compose.yml sincroniza los cambios del host dentro del contenedor
CMD ["npm", "run", "start:dev"]

# --- Etapa de producción (la usaremos más adelante, para el build final) ---
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]

# --- Etapa de desarrollo ---
FROM node:20-alpine AS development

WORKDIR /app

# Copiamos primero solo package.json: Docker cachea la instalación de dependencias
# en una capa separada y no la repite en cada cambio de código fuente
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# --host 0.0.0.0 es imprescindible: por defecto Vite solo escucha en localhost,
# lo cual es invisible desde fuera del contenedor. Sin este flag, nginx
# no podría alcanzar el servidor de desarrollo.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Etapa de producción (build estático servido más adelante por nginx) ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# La etapa de producción real no necesita Node.js: solo servimos los archivos
# estáticos generados. Nginx ya se encarga de esto en el servicio nginx del
# docker-compose, así que esta etapa solo produce el build, no lo sirve.

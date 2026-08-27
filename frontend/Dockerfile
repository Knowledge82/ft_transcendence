# --- Etapa de desarrollo ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Etapa de producción (build estático servido más adelante por nginx) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# El build en sí ya ocurrió arriba, DENTRO de la imagen — pero un
# volumen compartido con nginx solo existe cuando el contenedor
# realmente se EJECUTA, no durante "docker build". Este CMD es lo que
# copia el dist/ ya construido hacia ese volumen compartido, la única
# forma de que nginx (un contenedor distinto) pueda verlo.
CMD ["sh", "-c", "cp -r /app/dist/. /output/"]

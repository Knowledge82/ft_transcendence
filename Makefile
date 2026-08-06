# vars
# Autodetecta qué variante de Docker Compose está disponible en esta máquina:
# el binario standalone "docker-compose" (con guion, más antiguo, presente
# en el campus) o el plugin moderno "docker compose" (con espacio, el único
# disponible en instalaciones nuevas como el portátil personal). Así el
# mismo Makefile funciona en ambas máquinas sin tocar nada a mano.
COMPOSE := $(shell command -v docker-compose >/dev/null 2>&1 && echo docker-compose || echo "docker compose")

# Comprobación temprana: si ni siquiera el comando "docker" existe en esta
# máquina, cortamos aquí con un mensaje claro, en vez de dejar que falle
# más adelante con un críptico "command not found" del propio shell
ifeq ($(shell command -v docker >/dev/null 2>&1 && echo ok),)
$(error Docker no está instalado en esta máquina. Instálalo antes de continuar: https://docs.docker.com/get-docker/)
endif

# Comprobación de permisos: si "docker" existe pero no se puede hablar con
# el daemon (típico en Linux si el usuario no está en el grupo "docker", o
# si acaba de añadirse pero la sesión todavía no lo ha aplicado), avisamos
# con una solución concreta en vez de dejar que falle con un
# "permission denied" críptico más adelante
ifeq ($(shell docker ps >/dev/null 2>&1 && echo ok),)
$(error No se puede conectar con Docker (permission denied). Si acabas de instalar Docker o de añadir tu usuario al grupo "docker" con 'sudo usermod -aG docker $$USER', tienes que cerrar sesión y volver a entrar (o reiniciar) para que el cambio de grupo se aplique. Solución rápida sin reiniciar: ejecuta 'newgrp docker' en esta misma terminal antes de repetir el comando.)
endif
# colors
GREEN = \033[1;32m
RESET = \033[0m
# Regla principal (por defecto)
all: up
# Levantar todos los contenedores y construirlos si es necesario
up:
	@echo "$(GREEN)Levantando el proyecto...$(RESET)"
	$(COMPOSE) up --build
# Primer arranque en una máquina nueva: fuerza una reconstrucción completa
# SIN CACHÉ. Evita el problema de que Docker reutilice una capa antigua de
# "npm install" (por ejemplo, de un intento anterior fallido en esa misma
# máquina) y termine sirviendo dependencias desactualizadas o incompletas.
# Recomendado la primera vez que se clona el proyecto en un ordenador nuevo.
first-run:
	@echo "$(GREEN)Primer arranque: construyendo desde cero, sin caché...$(RESET)"
	$(COMPOSE) build --no-cache
	$(COMPOSE) up
# Detener los contenedores sin borrar los datos de la base de datos
down:
	@echo "$(GREEN)Deteniendo los servicios...$(RESET)"
	$(COMPOSE) down
# Ver los logs en tiempo real de todos los contenedores
logs:
	$(COMPOSE) logs -f
# --- Gestión de la Base de Datos (Prisma) ---
# Aplicar las migraciones de Prisma a la base de datos dentro del contenedor
db-migrate:
	@echo "$(GREEN)Aplicando el esquema sagrado de Prisma a la base de datos...$(RESET)"
	$(COMPOSE) exec backend npx prisma migrate dev --name init
# Abrir Prisma Studio (interfaz gráfica de la base de datos)
db-studio:
	$(COMPOSE) exec backend npx prisma studio
# Detener contenedores y borrarlos
clean:
	@echo "$(GREEN)Limpiando contenedores y volúmenes del proyecto.....$(RESET)"
	$(COMPOSE) down --volumes --remove-orphans
# Limpieza profunda: borra contenedores, volúmenes (¡OJO: borra la BD!) e imágenes huérfanas
fclean: clean
	@echo "$(GREEN)Eliminando imágenes específicas del proyecto...$(RESET)"
	$(COMPOSE) down --rmi all --volumes --remove-orphans	
rebuild:
	@echo "$(GREEN)Reconstruyendo sin borrar datos...$(RESET)"
	$(COMPOSE) up --build
# Reconstruir todo el proyecto desde cero
re: fclean all
# Indicamos que estas reglas no corresponden a nombres de archivos físicos
.PHONY: all up first-run down logs db-migrate db-studio clean fclean re rebuild

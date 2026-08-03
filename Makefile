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
# colors
GREEN = \033[1;32m
RESET = \033[0m
# Regla principal (por defecto)
all: up
# Levantar todos los contenedores y construirlos si es necesario
up:
	@echo "$(GREEN)Levantando el proyecto...$(RESET)"
	$(COMPOSE) up --build
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
.PHONY: all up down logs db-migrate db-studio clean fclean re rebuild

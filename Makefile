# vars
COMPOSE = docker-compose

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
	@echo "$(GREEN)Limpiando contenedores...$(RESET)"
	$(COMPOSE) down --volumes --remove-orphans

# Limpieza profunda: borra contenedores, volúmenes (¡OJO: borra la BD!) e imágenes huérfanas
fclean: clean
	@echo "$(GREEN)Realizando una limpieza total del caché de Docker...$(RESET)"
	docker system prune -a -f

# Reconstruir todo el proyecto desde cero
re: fclean all

# Indicamos que estas reglas no corresponden a nombres de archivos físicos
.PHONY: all up down logs db-migrate db-studio clean fclean re

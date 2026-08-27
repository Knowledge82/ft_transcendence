# vars
COMPOSE := $(shell command -v docker-compose >/dev/null 2>&1 && echo docker-compose || echo "docker compose")
ifeq ($(shell command -v docker >/dev/null 2>&1 && echo ok),)
$(error Docker no está instalado en esta máquina. Instálalo antes de continuar: https://docs.docker.com/get-docker/)
endif
ifeq ($(shell docker ps >/dev/null 2>&1 && echo ok),)
$(error No se puede conectar con Docker (permission denied))
endif

# Todas las reglas prod-* usan exactamente el mismo $(COMPOSE) autodetectado
# arriba, solo que apuntando al archivo de producción mediante -f — así se
# reutiliza la misma detección de docker-compose vs docker compose sin
# duplicarla, y ambos archivos (dev y prod) se mantienen completamente
# independientes y legibles de arriba a abajo por separado.
PROD_COMPOSE := $(COMPOSE) -f docker-compose.prod.yml

# colors
GREEN = \033[1;32m
RESET = \033[0m

# Regla principal (por defecto)
all: up

up:
	@echo "$(GREEN)Levantando el proyecto...$(RESET)"
	$(COMPOSE) up --build -d
	$(COMPOSE) restart nginx
	$(COMPOSE) logs -f

first-run:
	@echo "$(GREEN)Primer arranque: construyendo desde cero, sin caché...$(RESET)"
	$(COMPOSE) build --no-cache
	$(COMPOSE) up

down:
	@echo "$(GREEN)Deteniendo los servicios...$(RESET)"
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

# --- Gestión de la Base de Datos (Prisma) ---
db-migrate:
	@echo "$(GREEN)Aplicando migraciones pendientes...$(RESET)"
	$(COMPOSE) exec backend npx prisma migrate deploy

db-migrate-dev:
	ifndef name
		$(error Variable 'name' no definida! Usage: make db-migrate-dev name=my_migration)
	endif

	@echo "$(GREEN)Creando nueva migración: $(name)$(RESET)"
	$(COMPOSE) exec backend npx prisma migrate dev --name $(name)

db-studio:
	$(COMPOSE) exec backend npx prisma studio
# ---

clean:
	@echo "$(GREEN)Limpiando contenedores y volúmenes del proyecto.....$(RESET)"
	$(COMPOSE) down --volumes --remove-orphans

fclean: clean
	@echo "$(GREEN)Eliminando imágenes específicas del proyecto...$(RESET)"
	$(COMPOSE) down --rmi all --volumes --remove-orphans

re: fclean all

# --- Producción ---
# Igual que "up", pero apuntando al compose de producción: build sin
# hot-reload, backend ya compilado, frontend servido por nginx como
# archivos estáticos en vez de por el servidor de desarrollo de Vite.
prod-up:
	@echo "$(GREEN)Levantando el proyecto en modo PRODUCCIÓN...$(RESET)"
	$(PROD_COMPOSE) up --build -d
	$(PROD_COMPOSE) restart nginx
	$(PROD_COMPOSE) logs -f

prod-down:
	@echo "$(GREEN)Deteniendo los servicios de producción...$(RESET)"
	$(PROD_COMPOSE) down

prod-logs:
	$(PROD_COMPOSE) logs -f

prod-clean:
	@echo "$(GREEN)Limpiando contenedores y volúmenes de producción...$(RESET)"
	$(PROD_COMPOSE) down --volumes --remove-orphans

prod-fclean: prod-clean
	@echo "$(GREEN)Eliminando imágenes de producción...$(RESET)"
	$(PROD_COMPOSE) down --rmi all --volumes --remove-orphans

prod-re: prod-fclean prod-up

.PHONY: all up first-run down logs db-migrate db-migrate-dev db-studio clean fclean re \
        prod-up prod-down prod-logs prod-clean prod-fclean prod-re

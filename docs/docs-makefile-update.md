# Makefile — compatibilidad entre máquinas

## El problema

El mismo `Makefile` no funcionaba igual en todas las máquinas del equipo. En el campus (42 Barcelona), `docker-compose` (con guion, el binario standalone más antiguo) está instalado y funciona perfectamente. En una máquina personal con una instalación moderna de Docker, ese binario no existe — solo está disponible el plugin actual, invocado como `docker compose` (con espacio, dos palabras). El `Makefile` tenía la variable fijada así:

```makefile
COMPOSE = docker-compose
```

Esto provocaba, en cualquier máquina sin el binario antiguo, un error inmediato:
```
make: docker-compose: No such file or directory
```

Obligaba a editar el `Makefile` a mano cada vez que alguien del equipo cambiaba de máquina — algo que, con cuatro personas trabajando en distintos portátiles y en el campus, se vuelve tedioso y propenso a errores (fácil olvidar revertir el cambio antes de subirlo al repositorio).

## La solución — autodetección

```makefile
COMPOSE := $(shell command -v docker-compose >/dev/null 2>&1 && echo docker-compose || echo "docker compose")
```

Esta línea comprueba, **en el momento de leer el `Makefile`**, si el comando `docker-compose` existe en esa máquina concreta:
- Si existe (como en el campus) → `COMPOSE` se convierte en `docker-compose`
- Si no existe (como en una instalación moderna) → `COMPOSE` se convierte en `docker compose`

A partir de ahí, todas las reglas del `Makefile` siguen usando `$(COMPOSE)` exactamente igual que antes — no hay que tocar nada más, el mismo archivo funciona sin modificaciones en cualquier máquina del equipo.

### Detalles técnicos

- **`command -v docker-compose`** — la forma estándar (POSIX) de comprobar si un comando existe en el sistema, más portable que alternativas como `which`
- **`>/dev/null 2>&1`** — descarta toda la salida de esa comprobación; solo interesa si tuvo éxito o no, no su resultado literal
- **`:=` en vez de `=`** — con `:=`, el valor se calcula **una sola vez**, al leer el archivo. Con `=` normal, Make repetiría esa comprobación de shell cada vez que `$(COMPOSE)` se usa en el archivo — más lento, e innecesario aquí

## Aviso si Docker no está instalado en absoluto

Se añadió una comprobación adicional, esta vez usando la sintaxis condicional propia de Make (no de shell):

```makefile
ifeq ($(shell command -v docker >/dev/null 2>&1 && echo ok),)
$(error Docker no está instalado en esta máquina. Instálalo antes de continuar: https://docs.docker.com/get-docker/)
endif
```

Si ni siquiera el comando `docker` existe, `make` se detiene inmediatamente con un mensaje claro, en vez de dejar que el error aparezca más adelante, a mitad de una regla, como un críptico `docker: command not found` del propio sistema.

## Nueva regla añadida a `.PHONY`

De paso se añadió `rebuild` a la lista de `.PHONY` (ya existía como regla, pero faltaba declararla ahí) — esto le dice a Make que `rebuild` es el nombre de una acción, no el de un archivo físico que pudiera existir por casualidad con ese nombre en el directorio.


[VOLVER](../README.md)

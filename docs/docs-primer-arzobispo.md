# Cómo asignar el primer ARZOBISPO

Este es un procedimiento de arranque único: cambiar el rango de alguien solo se puede hacer desde el panel `/santuario`, pero ese panel solo es accesible para quien ya tiene el rango `ARZOBISPO` — así que el primer `ARZOBISPO` de cada base de datos nueva (por ejemplo, después de un `prisma migrate reset`, o al levantar el proyecto por primera vez en tu máquina) hay que asignarlo a mano, directamente en la base de datos.

## Paso 1 — Regístrate normalmente en la aplicación

Si todavía no tienes cuenta en esta base de datos, entra en la web y regístrate como lo haría cualquier hermano — por defecto, todo el mundo empieza con el rango `HERMANO`.

## Paso 2 — Averigua tu `id`

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "SELECT id, email, role FROM \"User\";"
```

Sustituye `<POSTGRES_USER>` y `<POSTGRES_DB>` por los valores reales de tu archivo `.env`. Verás una tabla con todos los usuarios registrados — anota el `id` de tu propia cuenta (identifícala por el email).

## Paso 3 — Súbete el rango a `ARZOBISPO`

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "UPDATE \"User\" SET role = 'ARZOBISPO' WHERE id = <tu_id>;"
```

Sustituye `<tu_id>` por el número que anotaste en el paso anterior.

## Paso 4 — Vuelve a iniciar sesión

Cierra sesión y vuelve a entrar (o simplemente espera a que `/altar` vuelva a pedir tus datos, lo que ocurre en cada carga de la página). Debería aparecerte el botón "Santuario".

## A partir de aquí

Ya no hace falta tocar la base de datos a mano nunca más — desde `/santuario` puedes cambiar el rango de cualquier usuario (incluido a `INQUISIDOR`) directamente desde la interfaz.

> 💡 Cuándo necesitarás repetir este proceso: cada vez que se reinicie la base de datos desde cero (`prisma migrate reset`, `make clean`, `make fclean`, `make re`) — todos los rangos se pierden junto con el resto de los datos, así que el primer `ARZOBISPO` siempre hay que crearlo así.

# Nombres únicos con sugerencias, y el registro público de "ejecuciones"

Dos mejoras relacionadas con la gestión de usuarios, surgidas al revisar el formulario de registro y la eliminación de cuentas desde /santuario.

## Parte 1 — Nombres de usuario únicos, con sugerencias si ya está en uso

### El problema

Dos personas podían registrarse con el mismo nombre para mostrar sin ningún aviso — confuso dentro de una comunidad donde el nombre es la forma principal de identificar a alguien.

### La solución

Se añadió una restricción de unicidad sobre displayName en el esquema de Prisma. Al registrarse, si el nombre ya está en uso, el backend no solo rechaza la petición — genera automáticamente tres sugerencias alternativas, tomadas de un pequeño repertorio de nombres antiguos y poco frecuentes, curado a mano y organizado por idioma y por género:

```typescript
const NAME_POOLS: Record<Language, Record<Gender, string[]>> = {
  es: {
    MASCULINO: ['Anselmo', 'Casimiro', 'Cipriano', ...],
    FEMENINO: ['Escolástica', 'Engracia', 'Perpetua', ...],
  },
  en: { ... },
  ar: { ... },
};
```

Cada sugerencia se comprueba individualmente contra la base de datos antes de ofrecerla — nunca se sugiere un nombre que, aunque esté en el repertorio, ya esté en uso por otra persona.

### Un matiz importante: insensibilidad a mayúsculas/minúsculas

Se decidió que la unicidad no debía distinguir mayúsculas de minúsculas ("Valeria" y "valeria" deben considerarse el mismo nombre). Esto afecta a dos comprobaciones distintas, y ambas debían coincidir:

1. La comprobación principal al registrarse (¿existe ya este nombre?).
2. La comprobación de disponibilidad de cada nombre candidato al generar sugerencias.

Ambas usan el modo insensitive de Prisma para PostgreSQL:

```typescript
const existingName = await this.prisma.user.findFirst({
  where: { displayName: { equals: dto.displayName, mode: 'insensitive' } },
});
```

Si solo una de las dos comprobaciones hubiera sido insensible a mayúsculas, se habría podido sugerir por error un nombre que, con otra capitalización, ya estaba en uso — precisamente el caso "tonto" que se identificó al revisar la función antes de darla por terminada.

Queda como limitación conocida, y deliberadamente no resuelta por ahora: la restricción de unicidad a nivel de base de datos (@unique en el esquema) sigue siendo sensible a mayúsculas por sí sola — solo la comprobación a nivel de aplicación es insensible. Para una garantía completa a nivel de base de datos haría falta un índice funcional sobre LOWER(displayName), fuera del alcance de esta mejora.

### El idioma y el género de las sugerencias

El idioma de las sugerencias se determina de la misma forma que ya usan el Confesor y el Oráculo — la cabecera Accept-Language, adjuntada automáticamente a la petición por el interceptor global de axios. El género se toma directamente del que la persona ya seleccionó en el propio formulario de registro.

### La interfaz

Cuando el backend devuelve el código DISPLAY_NAME_TAKEN junto con las sugerencias, el formulario las muestra como tres "píldoras" pulsables, repartidas por todo el ancho del contenedor:

```tsx
<div className="flex justify-around w-full mt-2">
  {nameSuggestions.map((name) => (
    <button key={name} type="button" onClick={() => applySuggestion(name)}>
      {name}
    </button>
  ))}
</div>
```

Pulsar una sugerencia rellena el campo automáticamente. Si la persona prefiere escribir su propio nombre en su lugar, las sugerencias desaparecen en cuanto empieza a teclear.

## Parte 2 — Qué queda al eliminar una cuenta

### El dilema

Al plantear si eliminar una cuenta debía ser un borrado completo o dejar algún rastro (por ejemplo, un perfil marcado como "quemado en la hoguera" pero con sus mensajes y artículos todavía visibles), surgió una contradicción temática real: una ejecución pública tradicionalmente se recuerda, pero seguir dando acceso a los escritos de alguien "ejecutado por hereje" resulta incoherente con esa misma idea.

### La decisión

Ni lo uno ni lo otro por separado: al eliminar una cuenta, todo su contenido desaparece por completo (perfil, mensajes, artículos — el comportamiento que ya existía), pero el hecho de la eliminación queda registrado públicamente en la crónica de la comunidad, igual que un auto de fe era un espectáculo público pensado para ser recordado, aunque la persona condenada no dejara nada propio atrás.

```typescript
async createUserExecutedEvent(name: string) {
  return this.createEvent('USER_EXECUTED', randomIndex('USER_EXECUTED'), { name });
}
```

Se dispara desde AdminController.deleteUser, justo después de que el usuario haya sido eliminado — usando su nombre, ya que en ese punto es lo único que queda de la cuenta.

### Por qué las frases evitan pronombres o verbos con marca de género

A diferencia del cambio de rango (donde sí hace falta conocer el género para elegir la palabra correcta en cada idioma), aquí se decidió mantener las tres frases completamente neutras en cuanto a género, para no tener que arrastrar ese dato hasta este punto del código. En español e inglés esto es sencillo (ningún pronombre de género en las frases elegidas). En árabe requirió más cuidado, porque los verbos concuerdan obligatoriamente en género con el sujeto — se usó la construcción impersonal "تم + sustantivo verbal" ("تم إعدام..." — se llevó a cabo la ejecución de...) en vez de un verbo conjugado, que sí habría exigido dos variantes (masculina y femenina) para cada frase.

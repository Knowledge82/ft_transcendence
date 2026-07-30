# Iglesia del Verdadero Relink

## Imagen y posicionamiento

Bien, vamos a desgranar la imagen sin generar todavía ninguna ilustración.

### Quiénes somos: la «Iglesia del Verdadero Relink»

Esto no es simple troleo. Es una **contra-secta**.

Por un lado está el culto informal que ya existe en el campus:
- Un Makefile «correcto» tiene que reaccionar a un `touch Makefile`
- Meter el `Makefile` y todas las cabeceras en las dependencias de los `.o` es un ritual sagrado
- Quien no lo hace es un hereje y el proyecto se considera «no funcional»
- El conocimiento se transmite de boca en boca, sin que nadie compruebe la fuente original

Por otro lado estamos nosotros.  
Cogemos **el mismo lenguaje** (secta, iglesia, verdadero/falso, herejes, conocimiento sagrado) y lo damos la vuelta. Nos convertimos en los que supuestamente custodian el *verdadero* conocimiento sobre qué es realmente un relink.

Esto es importante: no renunciamos a la metáfora religiosa. La **secuestramos**.

### Qué imagen debe transmitir el portal

Las tensiones clave que hay que mantener:

1. **Santidad vs Técnica**  
   Visual y tonalmente tiene que parecer una institución religiosa, pero toda la «santidad» se construye sobre cosas completamente terrenales: el `make` repetido, los timestamps, el grafo de dependencias, la diferencia entre recompile y relink. Cuanto más serio y solemne sea el tono, más gracioso resulta el contraste.

2. **Elitismo sin chulería**  
   Los estudiantes «avanzados» clásicos que te tiran el proyecto por un `touch Makefile` suelen transmitir la actitud de «yo ya sé cómo se hace bien y tú todavía no».  
   La Iglesia del Verdadero Relink tiene que estar en el otro lado: «simplemente nos hemos molestado en enterarnos, no lo hemos aceptado por fe». No es soberbia del tipo «somos más listos», sino irritación ante la transmisión de la ignorancia como si fuera tradición.

3. **Defensa de la Norma, no invención de una nueva**  
   No nos inventamos reglas propias. Defendemos el sentido literal de lo que pone en la Norma.  
   «Si el makefile hace relinks» = un `make` repetido no debe volver a linkar. Punto.  
   Todo lo demás son apócrifos.

4. **Anti-cargo-cult agresivo**  
   El tono puede (y debe) ser bastante duro. No un suave «vamos a verlo juntos», sino un directo «estáis confundiendo el culo con las témporas y encima reprobáis proyectos por ello».  
   Pero siempre con explicaciones. Una secta que *enseña*, no solo que condena.

### Posibles ejes visuales y tonales

- **Minimalismo oscuro, casi gótico** + texto de terminal en verde/ámbar. Como si fuera una orden antigua que guarda el conocimiento prohibido sobre `make`.
- O, al contrario, un estilo **pseudo-oficial**: como si fuera una página interna real del campus 42, solo que el contenido es completamente sarcástico.
- La imagen de «los últimos guardianes» — un grupo pequeño que todavía recuerda para qué se inventó la regla.
- La imagen de «la Inquisición al revés» — no vienen a quemar herejes, sino a señalar que la herejía hace tiempo que se convirtió en ortodoxia.

### El riesgo principal

Caer en el simple lloriqueo rencoroso de «todos son idiotas, solo yo lo entiendo».  
Entonces deja de ser una Iglesia y se convierte en otro rincón tóxico más.

La imagen fuerte se sostiene en que nosotros:

- explicamos de verdad la diferencia entre relink y rebuild,
- mostramos cómo hacerlo bien (y por qué),
- y *sobre esa base* nos reímos de los que exigen meter el `Makefile` en las dependencias de los objetos como si fuera una vaca sagrada.

Primero el conocimiento, después la burla.  
Si no, no somos más que la secta de gilipollas número 2, solo que con otra bandera.

---

## 1. Núcleo básico

- Registro / login (JWT + refresh tokens)
- Perfil de usuario con “rango” dentro de la Iglesia (Novicio, Adepto, Guardián del Relink, Arzobispo del Make, etc.)
- Sistema de roles y permisos

## 2. Núcleo social

- Amigos / “hermanos en la fe”
- Feed de actividad (quién ha convertido a quién, quién ha publicado una herejía, quién ha superado una prueba)
- Sistema de reputación / “Gracia”
- Posibilidad de “excomulgar” o imponer una “penitencia” (de forma humorística)

## 3. Contenido y conocimiento

- **Catecismo** — base de conocimiento:
  - Qué es un verdadero relink
  - Diferencia entre recompile y relink
  - Patrones correctos e incorrectos de Makefile
  - Análisis de las herejías típicas (`touch Makefile`, añadir manualmente los headers, etc.)
- Artículos / homilías (con soporte markdown + resaltado de código)
- Comentarios y discusiones bajo los materiales

## 4. Pruebas y gamificación

- **Pruebas de Fe** (quizzes):
  - “¿Esto es un relink?”
  - “¿Este Makefile es correcto?”
  - Análisis de ejemplos reales (anonimizados)
- Sistema de rangos y logros (badges):
  - “Entendió la diferencia entre `-c` y el linkado”
  - “No añadió el Makefile a las dependencias de los objetos”
  - “Explicó la herejía a un hereje sin mandarlo a la mierda”, etc.
- Pruebas diarias / semanales

## 5. Mecánicas sociales temáticas

- **Confesión** — formulario anónimo o semi-anónimo donde el usuario sube su Makefile pecaminoso y la comunidad (o el bot) señala las herejías
- **Excomunión** — posibilidad de “excomulgar” a un usuario por una herejía especialmente grave (con temporizador o por votación)
- **Conversión** — mecánica por la que traes a alguien nuevo y ganas Gracia
- Ranking de “Los herejes más fervientes” y “Los más firmes en la fe”

## 6. Comunicación

- Chat general de la Iglesia
- Mensajes privados
- Canales temáticos (`#herejias`, `#makefiles-correctos`, `#confesiones`, `#homilias`)
- Reacciones al estilo de la Iglesia (en lugar de likes: “amén”, “herejía”, “hágase el relink”, etc.)

## 7. Parte LLM (encaja muy bien)

- **Confesor-bot** — subes un trozo de Makefile y el bot te dice dónde está la herejía y dónde está lo correcto
- **Predicador** — genera homilías sarcásticas sobre make/relink
- **Examinador** — realiza un examen escrito sobre el tema
- Modo “Disputa con el hereje” — el bot defiende deliberadamente la posición del `touch Makefile` y tú tienes que convencerlo

## 8. Funcionalidades adicionales que pegarían muy bien

- “Muro de la Vergüenza” público — ejemplos anonimizados (o no) de los Makefiles más delirantes
- Generador de Makefiles “sagrados” (plantillas correctas para distintos proyectos de 42)
- Comparador de dos Makefiles (diff + veredicto “herejía / no herejía”)
- Calendario de fiestas litúrgicas (Día del Primer `all` Correcto, Fiesta de la Ausencia de Relink, etc.)
- Tema oscuro / claro + tema gótico-terminal por defecto
- Posibilidad de exportar tu “símbolo de fe” (texto corto + Makefile correcto) como imagen bonita

## 9. Administración y moderación

- Gestión de rangos
- Moderación de confesiones y publicaciones
- Gestión del contenido del Catecismo
- Estadísticas (cuántos herejes se han convertido, errores más frecuentes, etc.)


[VOLVER](../README.md)

---


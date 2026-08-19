# Inicio de sesión con 42 — configuración de la URL según cómo accedas

Si vas a probar el login con 42 desde un dispositivo distinto al que tiene el proyecto levantado (por ejemplo, desde el móvil o desde otro ordenador de tu misma red, usando la IP local en vez de localhost), lee esto antes de reportar un bug — probablemente no lo sea.

## El síntoma

El login con 42 funciona perfectamente si accedes desde https://localhost:8443, en la misma máquina donde corre Docker. Pero si accedes desde otro dispositivo usando la IP de esa máquina (por ejemplo https://192.168.1.133:8443), al volver de la pantalla de autorización de 42 el navegador muestra ERR_CONNECTION_REFUSED o "la página ha rechazado la conexión".

## Por qué pasa esto

localhost no es una dirección fija que apunte siempre al mismo sitio — significa literalmente "esta misma máquina", desde el punto de vista de quien lo interpreta. Cuando el backend redirige de vuelta al navegador tras el login con 42, usa la URL configurada en FRONTEND_URL. Si esa variable dice https://localhost:8443 pero estás accediendo desde OTRO dispositivo por IP, tu navegador intenta conectarse a sí mismo en el puerto 8443 — no al ordenador donde realmente corre Docker — y ahí no hay nada escuchando.

El mismo problema afecta a FORTYTWO_CALLBACK_URL: es la dirección que el propio 42 usa para devolverte tras el login, y tiene que coincidir exactamente con la que está registrada en la aplicación OAuth de la intra — no se puede improvisar en tiempo real.

## Cómo solucionarlo, según desde dónde vayas a acceder

Si solo vas a probar desde la misma máquina donde corre Docker: no tienes que hacer nada, la configuración por defecto (localhost) ya funciona.

Si vas a acceder desde otro dispositivo de tu red (móvil, otro ordenador) usando la IP local:

1. Averigua la IP local de la máquina que tiene el proyecto levantado (ip addr en Linux, ipconfig en Windows — busca algo como 192.168.x.x).
2. En tu .env, cambia:
   ```
   FRONTEND_URL=https://TU_IP_LOCAL:8443
   FORTYTWO_CALLBACK_URL=https://TU_IP_LOCAL:8443/api/auth/oauth/42/callback
   ```
3. Entra en tu aplicación OAuth en https://profile.intra.42.fr/oauth/applications/ y actualiza el campo Redirect URI para que coincida EXACTAMENTE con el nuevo FORTYTWO_CALLBACK_URL (un simple / de más al final ya lo rompe).
4. Reconstruye el backend para que recoja las nuevas variables:
   ```bash
   docker compose up -d --force-recreate backend
   ```

## Un detalle importante si cambias entre redes a menudo

Si un día pruebas desde el campus y otro día desde casa, la IP local cambia — no es algo que se configure una sola vez y se olvide. Cada vez que cambies de red y quieras probar el login con 42 desde otro dispositivo, hay que repetir los cuatro pasos anteriores con la IP nueva. El resto de la aplicación (todo lo que no sea el login con 42) no se ve afectado por esto — solo el flujo de OAuth necesita esta URL exacta y registrada de antemano.

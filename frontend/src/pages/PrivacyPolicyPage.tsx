import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-ink-950 px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>

        <h1 className="text-3xl font-semibold text-gold-500 mt-6 mb-8">
          Política de Privacidad
        </h1>

        <div className="space-y-6 text-cream-100 leading-relaxed text-sm">
          <p className="text-cream-400">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </p>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              1. Qué datos recogemos
            </h2>
            <p>
              Al registrarte en La Iglesia del Verdadero Relink recogemos tu
              dirección de correo electrónico, una contraseña (almacenada
              únicamente como hash, nunca en texto plano), y opcionalmente un
              nombre para mostrar y una imagen de avatar que decidas subir.
              También registramos tus mensajes de chat y tus relaciones de
              amistad dentro de la aplicación, así como marcas de tiempo de
              creación de tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              2. Para qué usamos tus datos
            </h2>
            <p>
              Tus datos se usan exclusivamente para el funcionamiento de la
              aplicación: autenticarte, mostrar tu perfil a otros usuarios,
              permitir la mensajería y las relaciones de amistad, y mantener
              tu sesión activa mediante tokens de acceso y actualización. No
              vendemos ni compartimos tus datos con terceros con fines
              publicitarios o comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              3. Cómo protegemos tus datos
            </h2>
            <p>
              Las contraseñas se almacenan con hash mediante bcrypt. Toda la
              comunicación entre tu navegador y nuestros servidores está
              cifrada mediante HTTPS. Los tokens de sesión se gestionan
              siguiendo buenas prácticas de seguridad: el token de acceso
              tiene una vida corta, y el token de renovación se almacena en
              una cookie inaccesible desde JavaScript.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              4. Tus derechos
            </h2>
            <p>
              Puedes actualizar tu nombre y tu avatar en cualquier momento
              desde tu perfil. Si deseas eliminar tu cuenta y los datos
              asociados a ella, puedes contactar con el equipo de la
              aplicación para solicitarlo.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              5. Cookies
            </h2>
            <p>
              Usamos una cookie técnica, estrictamente necesaria, para
              mantener tu sesión iniciada (el token de renovación de
              autenticación). No usamos cookies de seguimiento ni de
              publicidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              6. Contacto
            </h2>
            <p>
              Este es un proyecto académico desarrollado en el marco de 42
              Barcelona. Para cualquier consulta sobre tus datos, puedes
              contactar con el equipo de desarrollo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

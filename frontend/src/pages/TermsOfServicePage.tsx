import { Link } from 'react-router-dom';
import { PageContainer } from '../components/ui';

export function TermsOfServicePage() {
  return (
    <PageContainer className="px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>

        <h1 className="text-3xl font-semibold text-gold-500 mt-6 mb-8">
          Términos de Servicio
        </h1>

        <div className="space-y-6 text-cream-100 leading-relaxed text-sm">
          <p className="text-cream-400">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </p>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              1. Naturaleza del proyecto
            </h2>
            <p>
              La Iglesia del Verdadero Relink es un proyecto académico
              satírico desarrollado como parte del programa de 42 Barcelona.
              Su temática religiosa/ritual es humorística y no representa
              ninguna creencia, organización o práctica real. El uso de esta
              aplicación implica la aceptación de este tono como parte de la
              experiencia.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              2. Cuenta de usuario
            </h2>
            <p>
              Eres responsable de mantener la confidencialidad de tu
              contraseña y de toda actividad realizada desde tu cuenta.
              Debes proporcionar un correo electrónico válido al registrarte.
              Nos reservamos el derecho de suspender cuentas que incumplan
              estas condiciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              3. Conducta esperada
            </h2>
            <p>
              Aunque el tono de la plataforma es humorístico, se espera un
              trato respetuoso entre usuarios. No está permitido el acoso,
              la incitación al odio, ni la publicación de contenido ilegal a
              través del chat u otras funciones de la aplicación.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              4. Contenido subido por el usuario
            </h2>
            <p>
              Al subir una imagen de avatar, garantizas que tienes derecho a
              usarla y que no infringe derechos de terceros. Nos reservamos
              el derecho de eliminar contenido inapropiado.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              5. Disponibilidad del servicio
            </h2>
            <p>
              Al tratarse de un proyecto académico, no se garantiza
              disponibilidad continua ni ausencia de errores. El servicio se
              ofrece "tal cual", sin garantías de ningún tipo.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              6. Cambios en estos términos
            </h2>
            <p>
              Estos términos pueden actualizarse a medida que el proyecto
              evoluciona. Los cambios significativos se reflejarán en la
              fecha de última actualización indicada arriba.
            </p>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}

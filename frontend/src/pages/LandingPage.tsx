import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LOADER_MS = 1500;
const PURE_IMAGE_MS = 2000;
const GREETING_DELAY_MS = 600;
const BODY_DELAY_MS = 600;

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  const [stage, setStage] = useState<'loading' | 'image' | 'text'>('loading');
  const [progress, setProgress] = useState(0);
  const [showTitle, setShowTitle] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showBody, setShowBody] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setProgress(100));

    const toImage = setTimeout(() => setStage('image'), LOADER_MS);

    const textStart = LOADER_MS + PURE_IMAGE_MS;
    const toText = setTimeout(() => {
      setStage('text');
      setShowTitle(true);
    }, textStart);

    const toGreeting = setTimeout(
      () => setShowGreeting(true),
      textStart + GREETING_DELAY_MS,
    );

    const toBody = setTimeout(
      () => setShowBody(true),
      textStart + GREETING_DELAY_MS + BODY_DELAY_MS,
    );

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toImage);
      clearTimeout(toText);
      clearTimeout(toGreeting);
      clearTimeout(toBody);
    };
  }, []);

  const bodyParagraphs = [
    <p key="p1">
      ¿Te ha pasado esto en una defensa de proyecto en 42 Barcelona? El
      evaluador, con aire de suficiencia, abre tu terminal, escribe{' '}
      <code className="text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded">make</code>,
      ve la línea sagrada
    </p>,
    <pre
      key="p2"
      className="bg-ink-900 border border-ink-800 rounded-lg p-4 text-cream-400 text-sm overflow-x-auto"
    >
      make: Nothing to be done for 'all'.
    </pre>,
    <p key="p3">
      ...y aun así empieza a murmurar con desaprobación sobre un{' '}
      <em className="text-gold-400">"unnecessary relinking"</em>,
      exigiendo que añadas el Makefile y todas las cabeceras a las
      dependencias.
    </p>,
    <p key="p4">
      Y tú te quedaste ahí. Callado. Mientras por dentro hervía la
      indignación, la incredulidad, el puro estupor ante la profundidad de
      una ignorancia disfrazada de autoridad.
    </p>,
    <p key="p5" className="text-gold-500 font-medium">
      Tú conocías la verdad.
    </p>,
    <p key="p6">
      Tu <code className="text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded">make</code>{' '}
      se comportaba de forma perfectamente correcta. No había ningún
      relinkado de más. El linker no se ejecutaba en vano. Todo estaba en
      orden.
    </p>,
    <p key="p7">Pero aun así intentaron avergonzarte.</p>,
    <p key="p8">
      Porque en el Campus de 42 Barcelona, todavía hoy, muchos mezclan en un
      mismo saco dos conceptos completamente distintos: la recompilación
      —cuando el código fuente cambia y el objeto debe regenerarse— y el
      relinkado —cuando el binario final se reconstruye aunque ningún objeto
      haya cambiado en absoluto. Confundir ambos no es una opinión. Es una
      herejía.
    </p>,
    <p key="p9">
      Aquí no estás solo. Aquí hay quien ha leído el mismo mensaje de error,
      ha defendido el mismo Makefile impecable, y ha salido de esa sala con
      la misma certeza silenciosa de tener razón. Aquí se estudia la
      diferencia real entre recompilar y relinkar, se señalan las herejías
      más comunes, y se confiesa —sin juicio, o con el juicio justo y
      merecido— cada Makefile pecaminoso.
    </p>,
    <p key="p10" className="text-cream-400">
      Las puertas del Verdadero Relink están abiertas.
    </p>,
  ];

  return (
    <div className="min-h-screen bg-ink-950 relative overflow-hidden">
      {/* Loader */}
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950 transition-opacity duration-700 ${
          stage === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <p className="text-sm uppercase tracking-widest text-cream-400">
          Cargando
        </p>
        <div className="w-56 h-1 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 transition-all ease-linear"
            style={{ width: `${progress}%`, transitionDuration: `${LOADER_MS}ms` }}
          />
        </div>
      </div>

      {/* Background image: fully bright during "image", dims once "text" begins */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: "url('/hero-cathedral.png')",
          opacity: stage === 'loading' ? 0 : 1,
        }}
      />

      {/* Dark overlay: fades in only for the text stage */}
      <div
        className={`fixed inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950 transition-opacity duration-[1500ms] ${
          stage === 'text' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Layer 1: big title */}
        <h1
          className={`text-4xl md:text-5xl font-semibold text-gold-500 text-center mb-6 transition-opacity duration-1000 ${
            showTitle ? 'opacity-100' : 'opacity-0'
          }`}
        >
          La Iglesia del Verdadero Relink
        </h1>

        {/* Layer 2: greeting */}
        <p
          className={`text-xl text-cream-100 text-center mb-10 transition-opacity duration-1000 ${
            showGreeting ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Hermano. Hermana.
        </p>

        {/* Layer 3: body, cascading top to bottom via per-paragraph delay */}
        <div className="space-y-6 text-cream-100 leading-relaxed">
          {bodyParagraphs.map((paragraph, index) => (
            <div
              key={index}
              className={`transition-all duration-700 ${
                showBody ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: showBody ? `${index * 150}ms` : '0ms' }}
            >
              {paragraph}
            </div>
          ))}
        </div>

        <div
          className={`mt-12 flex flex-col items-center gap-3 transition-opacity duration-700 ${
            showBody ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: showBody ? `${bodyParagraphs.length * 150}ms` : '0ms' }}
        >
          {isAuthenticated ? (
            <Link
              to="/altar"
              className="bg-gold-500 text-gold-on font-medium px-6 py-3 rounded-md hover:bg-gold-400 transition-colors"
            >
              Entrar al Altar
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-gold-500 text-gold-on font-medium px-6 py-3 rounded-md hover:bg-gold-400 transition-colors"
              >
                Únete a la Iglesia
              </Link>
              <Link to="/login" className="text-sm text-cream-400 hover:text-cream-100">
                Ya soy hermano — iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

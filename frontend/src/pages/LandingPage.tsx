import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';

const TITLE = 'La Iglesia del Verdadero Relink';
const LOADER_MS = 2000;
const PAUSE_AFTER_TYPING_MS = 800;
const PURE_IMAGE_MS = 2000;
const BODY_DELAY_MS = 700;

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  const [stage, setStage] = useState<'loading' | 'image' | 'text'>('loading');
  const [visibleChars, setVisibleChars] = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showBody, setShowBody] = useState(false);

  useEffect(() => {
    const msPerChar = LOADER_MS / TITLE.length;
    const typeInterval = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= TITLE.length) {
          clearInterval(typeInterval);
          return prev;
        }
        return prev + 1;
      });
    }, msPerChar);

    const imageStart = LOADER_MS + PAUSE_AFTER_TYPING_MS;
    const toImage = setTimeout(() => setStage('image'), imageStart);

    const textStart = imageStart + PURE_IMAGE_MS;
    const toText = setTimeout(() => {
      setStage('text');
      setShowGreeting(true);
    }, textStart);

    const toBody = setTimeout(() => setShowBody(true), textStart + BODY_DELAY_MS);

    return () => {
      clearInterval(typeInterval);
      clearTimeout(toImage);
      clearTimeout(toText);
      clearTimeout(toBody);
    };
  }, []);

  const bodyParagraphs = [
    <p key="p1">¿Te ha pasado esto en una defensa en 42 Barcelona?</p>,
    <p key="p2">
      El evaluador, con su aire de suficiencia, ejecuta{' '}
      <code className="text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded">make</code>{' '}
      después de buildear tu precioso, brillante y totalmente correcto
      proyecto. Aparece la línea sagrada:
    </p>,
    <pre
      key="p3"
      className="bg-ink-900 border border-ink-800 rounded-lg p-4 text-cream-400 text-sm overflow-x-auto"
    >
      make: Nothing to be done for 'all'.
    </pre>,
    <p key="p4">
      Pero no le basta. Con una cara de gilipollas increíble, escribe{' '}
      <code className="text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded">
        touch Makefile
      </code>
      , ejecuta <code className="text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded">make</code>{' '}
      otra vez y se queda esperando con superioridad moral, afirmando que tu
      Makefile está mal porque «no has añadido el Makefile ni los headers
      como dependencias».
    </p>,
    <p key="p5">
      Y tú te quedaste ahí. Callado. Mientras por dentro te hervía la sangre
      ante semejante ignorancia disfrazada de autoridad.
    </p>,
    <p key="p6" className="text-gold-500 font-medium">
      Tú conocías la verdad.
    </p>,
    <p key="p7">
      Tu <code className="text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded">make</code>{' '}
      era impecable. El linker no se había ejecutado en vano. No había
      ningún relinkado.
    </p>,
    <p key="p8">
      Confundir la recompilación con el relinkado no es una opinión. Es una
      pura herejía.
    </p>,
    <p key="p9">
      Aquí no estás solo. Aquí te revelamos toda la verdad de los
      Makefiles, entendemos la diferencia, defendemos los Makefiles limpios
      y señalamos a los falsos profetas.
    </p>,
    <p key="p10" className="text-cream-400">
      Las puertas del Verdadero Relink están abiertas. Entra.
    </p>,
  ];

  return (
    <div className="min-h-screen bg-ink-950 relative overflow-hidden flex flex-col">
      {/* Loader: typewriter title centered, "Cargando" pinned to the bottom */}
      <div
        className={`fixed inset-0 bg-ink-950 transition-opacity duration-700 ${
          stage === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-gold-500 text-center leading-tight">
            {TITLE.slice(0, visibleChars)}
          </h1>
        </div>
        <p className="absolute bottom-12 left-0 right-0 text-center text-sm uppercase tracking-widest text-cream-400 animate-pulse">
          Cargando
        </p>
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

      <div className="relative max-w-2xl mx-auto px-6 py-16 flex-1">
        {/* Greeting (the big title already appeared during the loader, not repeated here) */}
        <p
          className={`text-xl text-cream-100 text-center mb-10 transition-opacity duration-1000 ${
            showGreeting ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Hermano. Hermana.
        </p>

        {/* Body, cascading top to bottom via per-paragraph delay */}
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
              className="bg-gold-500 text-gold-on font-medium px-6 py-3 rounded-md hover:bg-gold-400 transition-colors animate-[pulse-glow_2.5s_ease-in-out_infinite]"
            >
              Entrar al Altar
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-gold-500 text-gold-on font-medium px-6 py-3 rounded-md hover:bg-gold-400 transition-colors animate-[pulse-glow_2.5s_ease-in-out_infinite]"
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

      <div
        className={`relative transition-opacity duration-700 ${
          showBody ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Footer />
      </div>
    </div>
  );
}

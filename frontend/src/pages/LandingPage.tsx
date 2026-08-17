import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// Deliberately NOT translated — this is the project's brand/proper name,
// the same way "McDonald's" doesn't get translated into other languages
const TITLE = 'La Iglesia del Verdadero Relink';
const LOADER_MS = 2000;
const PAUSE_AFTER_TYPING_MS = 800;
const PURE_IMAGE_MS = 2000;
const BODY_DELAY_MS = 700;

export function LandingPage() {
  const { t } = useTranslation();
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

  const codeClass = 'text-gold-400 bg-ink-900 px-1.5 py-0.5 rounded';

  // p3 (the terminal output block) is intentionally NOT translated below —
  // it's the real output of the `make` command, which is always in
  // English regardless of the interface language, same as any other
  // program's literal console output
  const bodyParagraphs = [
    <p key="p1">{t('landing.p1')}</p>,
    <p key="p2">
      <Trans i18nKey="landing.p2" components={[<code className={codeClass} key="c0" />]} />
    </p>,
    <pre
      key="p3"
      className="bg-ink-900 border border-border-default rounded-lg p-4 text-cream-400 text-sm overflow-x-auto"
      dir="ltr"
    >
      make: Nothing to be done for 'all'.
    </pre>,
    <p key="p4">
      <Trans
        i18nKey="landing.p4"
        components={[
          <code className={codeClass} key="c0" />,
          <code className={codeClass} key="c1" />,
        ]}
      />
    </p>,
    <p key="p5">{t('landing.p5')}</p>,
    <p key="p6" className="text-gold-500 font-medium">
      {t('landing.p6')}
    </p>,
    <p key="p7">
      <Trans i18nKey="landing.p7" components={[<code className={codeClass} key="c0" />]} />
    </p>,
    <p key="p8">{t('landing.p8')}</p>,
    <p key="p9">{t('landing.p9')}</p>,
    <p key="p10" className="text-cream-400">
      {t('landing.p10')}
    </p>,
  ];

  return (
    <div className="min-h-screen bg-ink-950 relative overflow-hidden flex flex-col">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Loader: typewriter title centered, "Cargando" pinned to the bottom */}
      <div
        className={`fixed inset-0 bg-ink-950 transition-opacity duration-700 ${
          stage === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-gold-500 text-center leading-tight" dir="ltr">
            {TITLE.slice(0, visibleChars)}
          </h1>
        </div>
        <p className="absolute bottom-12 left-0 right-0 text-center text-sm uppercase tracking-widest text-cream-400 animate-text-pulse-safe">
          {t('landing.loading')}
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
          {t('landing.greeting')}
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
              to="/celda"
              className="bg-gold-500 text-gold-on font-medium px-6 py-3 rounded-md hover:bg-gold-400 transition-colors animate-[pulse-glow_2.5s_ease-in-out_infinite]"
            >
              {t('landing.ctaAuthenticated')}
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-gold-500 text-gold-on font-medium px-6 py-3 rounded-md hover:bg-gold-400 transition-colors animate-[pulse-glow_2.5s_ease-in-out_infinite]"
              >
                {t('landing.ctaRegister')}
              </Link>
              <Link to="/login" className="text-sm text-cream-400 hover:text-cream-100">
                {t('landing.ctaLogin')}
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

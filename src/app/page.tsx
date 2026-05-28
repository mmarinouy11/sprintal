"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LandingLocale = "en" | "es" | "pt";

const landingCopy = {
  en: {
    nav: { features: "Features", pricing: "Pricing", blog: "Blog", signIn: "Sign in", startFree: "Start free" },
    hero: {
      title: "Strategy that learns.",
      subtitle:
        "Sprintal helps leadership teams run strategic sprints — testable bets with clear kill criteria, early signals, and structured learning cycles.",
      primaryCta: "Start your first sprint free",
      secondaryCta: "See pricing",
    },
    problem: {
      title: "The market moves faster than your planning cycle.",
      body: "By the time you know something isn't working, you've already spent the quarter on it. The organizations that win aren't the ones with the best plans — they're the ones that adapt fastest.",
    },
    concept: {
      title: "Stop executing plans. Start testing bets.",
      body: "A Strategic Bet is a testable hypothesis — not a project, not a task. It comes with a hypothesis, a kill signal defined upfront, leading indicators, and a structured review cycle. Your team knows when to push, when to pivot, and when to stop — before it's too late.",
      cards: [
        {
          title: "Hypothesis-driven",
          body: "Every bet starts with a clear if->then->measured by structure.",
        },
        {
          title: "Kill criteria upfront",
          body: "Define when to stop before you start. Remove politics from the decision.",
        },
        {
          title: "Leading indicators",
          body: "Track signals that tell you early — not lagging metrics that tell you after.",
        },
      ],
    },
    how: {
      title: "A sprint cadence built for strategic decisions.",
      steps: [
        { title: "Define", body: "Set your sprint focus and portfolio of bets." },
        { title: "Signal", body: "Check signal strength every sprint/6 days. Strong / Unclear / Weak." },
        { title: "Review", body: "3 strategic reviews per sprint. Keep, Scale, Pivot, or Kill." },
        { title: "Learn", body: "Close the sprint with structured learnings. Feed the next cycle." },
      ],
    },
    coach: {
      title: "An AI coach that thinks strategically.",
      formulationTitle: "Formulation Coach",
      formulationBody:
        "Validates structural quality field by field. Is your hypothesis measurable? Does your kill criteria have a threshold? Activates on blur, responds in your language.",
      strategicTitle: "Strategic Coach",
      strategicBody:
        "Analyzes portfolio coherence against market trends. Searches for benchmarks, cites sources, gives one integrated observation. Not generic advice — strategic context.",
    },
    teams: {
      title: "Built for how organizations actually work.",
      cards: [
        {
          title: "Multi-level",
          body: "Corporate -> Business Unit -> Team. Each level has its own sprint. Strategy cascades. Learning flows back up.",
        },
        {
          title: "Role-based",
          body: "Owners, Admins, Editors, Viewers. Everyone sees what they need. Nobody sees what they shouldn't.",
        },
        {
          title: "Always informed",
          body: "Signal check reminders, review due alerts, weak bet warnings. The system keeps everyone accountable — not just the exec team.",
        },
      ],
    },
    pricing: {
      title: "Simple, transparent pricing.",
      subtitle: "Start free. No credit card required. Upgrade when your team is ready.",
      monthly: "Monthly",
      annual: "Annual",
      mostPopular: "Most popular",
      getStarted: "Get started",
      rows: {
        orgDepth: "Org depth",
        activeBets: "Active bets",
        coachCredits: "Coach credits",
        strategicCoach: "Strategic coach",
        closeSprint: "Close Sprint",
        support: "Support",
      },
    },
    finalCta: {
      title: "Your strategy deserves to learn.",
      subtitle: "Start your first sprint free. No credit card required.",
      cta: "Start free now",
    },
    footer: {
      tagline: "Strategy that learns.",
      pricing: "Pricing",
      signIn: "Sign in",
      signUp: "Sign up",
      copyright: "© 2026 Sprintal",
    },
  },
  es: {
    nav: { features: "Funciones", pricing: "Precios", blog: "Blog", signIn: "Iniciar sesión", startFree: "Comenzar gratis" },
    hero: {
      title: "Estrategia que aprende.",
      subtitle:
        "Sprintal ayuda a los equipos de liderazgo a correr sprints estratégicos — apuestas testeables con criterios de kill claros, señales tempranas y ciclos de aprendizaje estructurados.",
      primaryCta: "Comenzá tu primer sprint gratis",
      secondaryCta: "Ver precios",
    },
    problem: {
      title: "El mercado se mueve más rápido que tu ciclo de planificación.",
      body: "Para cuando sabés que algo no está funcionando, ya gastaste el trimestre en ello. Las organizaciones que ganan no son las que tienen los mejores planes — son las que se adaptan más rápido.",
    },
    concept: {
      title: "Dejá de ejecutar planes. Empezá a testear apuestas.",
      body: "Una Apuesta Estratégica es una hipótesis testeable — no un proyecto, no una tarea. Incluye una hipótesis, una señal de kill definida desde el inicio, indicadores líderes y un ciclo de revisión estructurado. Tu equipo sabe cuándo empujar, cuándo pivotar y cuándo frenar — antes de que sea tarde.",
      cards: [
        {
          title: "Impulsada por hipótesis",
          body: "Cada apuesta empieza con una estructura clara de si->entonces->medido por.",
        },
        {
          title: "Criterios de kill desde el inicio",
          body: "Definí cuándo parar antes de empezar. Sacá la política de la decisión.",
        },
        {
          title: "Indicadores líderes",
          body: "Seguí señales que avisan temprano — no métricas tardías que confirman después.",
        },
      ],
    },
    how: {
      title: "Una cadencia de sprint hecha para decisiones estratégicas.",
      steps: [
        { title: "Definir", body: "Definí el foco del sprint y el portafolio de apuestas." },
        { title: "Señal", body: "Revisá fuerza de señal cada sprint/6 días. Fuerte / Incierta / Débil." },
        { title: "Revisar", body: "3 revisiones estratégicas por sprint. Mantener, Escalar, Pivotar o Matar." },
        { title: "Aprender", body: "Cerrá el sprint con aprendizajes estructurados. Alimentá el próximo ciclo." },
      ],
    },
    coach: {
      title: "Un coach de IA que piensa estratégicamente.",
      formulationTitle: "Coach de Formulación",
      formulationBody:
        "Valida calidad estructural campo por campo. ¿Tu hipótesis es medible? ¿Tu criterio de kill tiene umbral? Se activa al salir del campo y responde en tu idioma.",
      strategicTitle: "Coach Estratégico",
      strategicBody:
        "Analiza coherencia del portafolio frente a tendencias de mercado. Busca benchmarks, cita fuentes y entrega una observación integrada. No es consejo genérico — es contexto estratégico.",
    },
    teams: {
      title: "Construido para cómo trabajan realmente las organizaciones.",
      cards: [
        {
          title: "Multinivel",
          body: "Corporativo -> Unidad de Negocio -> Equipo. Cada nivel tiene su sprint. La estrategia baja. El aprendizaje sube.",
        },
        {
          title: "Por roles",
          body: "Owners, Admins, Editors, Viewers. Todos ven lo que necesitan. Nadie ve lo que no debe.",
        },
        {
          title: "Siempre informados",
          body: "Recordatorios de chequeo de señal, alertas de revisión, avisos de apuestas débiles. El sistema mantiene a todos responsables — no solo al equipo ejecutivo.",
        },
      ],
    },
    pricing: {
      title: "Precios simples y transparentes.",
      subtitle: "Empezá gratis. Sin tarjeta de crédito. Escalá cuando tu equipo esté listo.",
      monthly: "Mensual",
      annual: "Anual",
      mostPopular: "Más popular",
      getStarted: "Comenzar",
      rows: {
        orgDepth: "Profundidad org",
        activeBets: "Apuestas activas",
        coachCredits: "Créditos de Coach",
        strategicCoach: "Coach estratégico",
        closeSprint: "Cerrar Sprint",
        support: "Soporte",
      },
    },
    finalCta: {
      title: "Tu estrategia merece aprender.",
      subtitle: "Comenzá tu primer sprint gratis. Sin tarjeta de crédito.",
      cta: "Comenzar gratis",
    },
    footer: {
      tagline: "Estrategia que aprende.",
      pricing: "Precios",
      signIn: "Iniciar sesión",
      signUp: "Registrarse",
      copyright: "© 2026 Sprintal",
    },
  },
  pt: {
    nav: { features: "Recursos", pricing: "Precos", blog: "Blog", signIn: "Entrar", startFree: "Comecar gratis" },
    hero: {
      title: "Estrategia que aprende.",
      subtitle:
        "Sprintal ajuda equipes de liderança a executar sprints estratégicos — apostas testáveis com critérios de kill claros, sinais antecipados e ciclos de aprendizado estruturados.",
      primaryCta: "Comece seu primeiro sprint grátis",
      secondaryCta: "Ver precos",
    },
    problem: {
      title: "O mercado se move mais rápido do que seu ciclo de planejamento.",
      body: "Quando você percebe que algo não está funcionando, já gastou o trimestre nisso. As organizações que vencem não são as que têm os melhores planos — são as que se adaptam mais rápido.",
    },
    concept: {
      title: "Pare de executar planos. Comece a testar apostas.",
      body: "Uma Aposta Estratégica é uma hipótese testável — não um projeto, não uma tarefa. Ela tem uma hipótese, um sinal de kill definido antes, indicadores de liderança e um ciclo estruturado de revisão. Seu time sabe quando avançar, quando pivotar e quando parar — antes que seja tarde.",
      cards: [
        {
          title: "Guiada por hipótese",
          body: "Toda aposta começa com uma estrutura clara de se->entao->medido por.",
        },
        {
          title: "Critérios de kill desde o inicio",
          body: "Defina quando parar antes de começar. Tire a política da decisão.",
        },
        {
          title: "Indicadores de liderança",
          body: "Acompanhe sinais que avisam cedo — não métricas atrasadas que confirmam depois.",
        },
      ],
    },
    how: {
      title: "Uma cadência de sprint para decisões estratégicas.",
      steps: [
        { title: "Definir", body: "Defina o foco do sprint e o portfólio de apostas." },
        { title: "Sinal", body: "Cheque força de sinal a cada sprint/6 dias. Forte / Incerto / Fraco." },
        { title: "Revisar", body: "3 revisões estratégicas por sprint. Manter, Escalar, Pivotar ou Encerrar." },
        { title: "Aprender", body: "Feche o sprint com aprendizados estruturados. Alimente o próximo ciclo." },
      ],
    },
    coach: {
      title: "Um coach de IA que pensa estrategicamente.",
      formulationTitle: "Coach de Formulação",
      formulationBody:
        "Valida qualidade estrutural campo a campo. Sua hipótese é mensurável? Seu critério de kill tem limite? Ativa no blur e responde no seu idioma.",
      strategicTitle: "Coach Estratégico",
      strategicBody:
        "Analisa coerência do portfólio com tendências de mercado. Busca benchmarks, cita fontes e entrega uma observação integrada. Não é conselho genérico — é contexto estratégico.",
    },
    teams: {
      title: "Feito para como as organizações realmente trabalham.",
      cards: [
        {
          title: "Multi-nível",
          body: "Corporativo -> Unidade de Negócio -> Time. Cada nível tem seu sprint. A estratégia desce. O aprendizado sobe.",
        },
        {
          title: "Baseado em papéis",
          body: "Owners, Admins, Editors, Viewers. Todos veem o que precisam. Ninguém vê o que não deve.",
        },
        {
          title: "Sempre informados",
          body: "Lembretes de sinal, alertas de revisão, avisos de apostas fracas. O sistema mantém todos responsáveis — não só o time executivo.",
        },
      ],
    },
    pricing: {
      title: "Precos simples e transparentes.",
      subtitle: "Comece grátis. Sem cartão de crédito. Faça upgrade quando seu time estiver pronto.",
      monthly: "Mensal",
      annual: "Anual",
      mostPopular: "Mais popular",
      getStarted: "Comecar",
      rows: {
        orgDepth: "Profundidade org",
        activeBets: "Apostas ativas",
        coachCredits: "Créditos de Coach",
        strategicCoach: "Coach estratégico",
        closeSprint: "Fechar Sprint",
        support: "Suporte",
      },
    },
    finalCta: {
      title: "Sua estratégia merece aprender.",
      subtitle: "Comece seu primeiro sprint grátis. Sem cartão de crédito.",
      cta: "Comece agora",
    },
    footer: {
      tagline: "Estrategia que aprende.",
      pricing: "Precos",
      signIn: "Entrar",
      signUp: "Registrar",
      copyright: "© 2026 Sprintal",
    },
  },
} as const;

const plans: Array<{
  key: string;
  name: string;
  priceMonthly: string;
  priceAnnual: string;
  orgDepth: string;
  activeBets: string;
  coachCredits: string;
  strategicCoach: string;
  closeSprint: string;
  support: string;
  popular?: boolean;
}> = [
  {
    key: "trial",
    name: "Trial",
    priceMonthly: "$0",
    priceAnnual: "$0",
    orgDepth: "L1",
    activeBets: "5",
    coachCredits: "50",
    strategicCoach: "✗",
    closeSprint: "✗",
    support: "Community",
  },
  {
    key: "solo",
    name: "Solo",
    priceMonthly: "$49",
    priceAnnual: "$39",
    orgDepth: "L1",
    activeBets: "Unlimited",
    coachCredits: "300",
    strategicCoach: "✗",
    closeSprint: "✓",
    support: "48h email",
  },
  {
    key: "starter",
    name: "Starter",
    priceMonthly: "$79",
    priceAnnual: "$63",
    orgDepth: "L1",
    activeBets: "Unlimited",
    coachCredits: "600",
    strategicCoach: "✓",
    closeSprint: "✓",
    support: "48h email",
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthly: "$199",
    priceAnnual: "$159",
    orgDepth: "L1+L2",
    activeBets: "Unlimited",
    coachCredits: "1,200",
    strategicCoach: "✓",
    closeSprint: "✓",
    support: "24h email",
    popular: true,
  },
  {
    key: "scale",
    name: "Scale",
    priceMonthly: "$399",
    priceAnnual: "$319",
    orgDepth: "L1->L4",
    activeBets: "Unlimited",
    coachCredits: "3,000",
    strategicCoach: "✓",
    closeSprint: "✓",
    support: "Priority",
  },
] as const;

function parseLocale(value: string | null | undefined): LandingLocale | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "es" || normalized === "pt" || normalized === "en") return normalized;
  return null;
}

function getCookieLocale(): LandingLocale | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith("NEXT_LOCALE="))
    ?.split("=")[1];
  return parseLocale(value);
}

function useLandingT() {
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    const cookieLocale = getCookieLocale();
    if (cookieLocale) {
      setLocale(cookieLocale);
      return;
    }
    const browserLocale = parseLocale(navigator.language?.slice(0, 2));
    if (browserLocale) setLocale(browserLocale);
  }, []);

  const setLocaleAndPersist = (nextLocale: LandingLocale) => {
    setLocale(nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  };

  const t = useMemo(() => landingCopy[locale], [locale]);

  return { locale, setLocale: setLocaleAndPersist, t, billingCycle, setBillingCycle };
}

function ScreenshotPlaceholder({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div
      className={`w-full rounded-2xl border border-white/20 shadow-xl ${tall ? "aspect-[4/3]" : "aspect-video"}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(92,106,196,0.3) 0%, rgba(92,106,196,0.08) 50%, rgba(255,255,255,0.2) 100%)",
      }}
    >
      <div className="flex h-full w-full items-center justify-center text-center text-sm font-medium text-[var(--t2)]">
        {label}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { locale, setLocale, t, billingCycle, setBillingCycle } = useLandingT();

  return (
    <main className="min-h-screen bg-[#FAFAF8] text-[var(--text)] scroll-smooth">
      <nav className="sticky top-0 z-40 border-b border-black/5 bg-[#FAFAF8]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#5C6AC4]">
            Sprintal
          </Link>
          <div className="hidden items-center gap-6 text-sm text-[var(--t2)] md:flex">
            <a href="#features" className="hover:text-[var(--text)]">{t.nav.features}</a>
            <a href="#pricing" className="hover:text-[var(--text)]">{t.nav.pricing}</a>
            <span className="opacity-60">{t.nav.blog}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1">
              {(["en", "es", "pt"] as LandingLocale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLocale(lang)}
                  className={`rounded-full px-2 py-1 text-xs font-medium uppercase ${
                    locale === lang ? "bg-[#5C6AC4] text-white" : "text-[var(--t2)] hover:text-[var(--text)]"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <Link href="/auth/login" className="text-sm font-medium text-[var(--t2)] hover:text-[var(--text)]">
              {t.nav.signIn}
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-[#5C6AC4] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.nav.startFree}
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-8 lg:pt-20">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.hero.title}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--t2)] sm:text-lg">{t.hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="rounded-full bg-[#5C6AC4] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.hero.primaryCta}
            </Link>
            <a
              href="#pricing"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[var(--text)] hover:bg-black/5"
            >
              {t.hero.secondaryCta}
            </a>
          </div>
        </div>
        <ScreenshotPlaceholder label="SCREENSHOT: dashboard" />
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.problem.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--t2)] sm:text-lg">{t.problem.body}</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-gradient-to-br from-[#5C6AC4]/15 via-transparent to-[#1a1a2e]/10 p-10" />
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.concept.title}</h2>
        <p className="mt-5 max-w-4xl text-base leading-relaxed text-[var(--t2)] sm:text-lg">{t.concept.body}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {t.concept.cards.map((card, idx) => (
            <article key={card.title} className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
              <div className="mb-3 text-lg">{idx === 0 ? "🎯" : idx === 1 ? "⚡" : "📊"}</div>
              <h3 className="text-base font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--t2)]">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.how.title}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {t.how.steps.map((step, idx) => (
            <article key={step.title} className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
              <div className="mb-3 text-xl">{idx === 0 ? "🧭" : idx === 1 ? "📡" : idx === 2 ? "🧪" : "🧠"}</div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--t2)]">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.coach.title}</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">{t.coach.formulationTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--t2)]">{t.coach.formulationBody}</p>
            <div className="mt-5">
              <ScreenshotPlaceholder label="SCREENSHOT: formulation coach" tall />
            </div>
          </article>
          <article className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">{t.coach.strategicTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--t2)]">{t.coach.strategicBody}</p>
            <div className="mt-5">
              <ScreenshotPlaceholder label="SCREENSHOT: strategic coach" tall />
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.teams.title}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {t.teams.cards.map((card, idx) => (
            <article key={card.title} className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
              <div className="mb-3 text-lg">{idx === 0 ? "🏢" : idx === 1 ? "👥" : "🔔"}</div>
              <h3 className="text-base font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--t2)]">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.pricing.title}</h2>
        <p className="mt-4 text-base text-[var(--t2)] sm:text-lg">{t.pricing.subtitle}</p>
        <div className="mt-6 inline-flex rounded-full border border-black/10 bg-white p-1">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              billingCycle === "monthly" ? "bg-[#5C6AC4] text-white" : "text-[var(--t2)]"
            }`}
          >
            {t.pricing.monthly}
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              billingCycle === "annual" ? "bg-[#5C6AC4] text-white" : "text-[var(--t2)]"
            }`}
          >
            {t.pricing.annual}
          </button>
        </div>
        <div className="mt-8 -mx-4 overflow-x-auto px-4">
          <div className="grid min-w-[1080px] grid-cols-5 gap-4">
            {plans.map((plan) => (
              <article
                key={plan.key}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  plan.popular ? "border-[#5C6AC4] ring-1 ring-[#5C6AC4]/40" : "border-black/8"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.popular ? (
                    <span className="rounded-full bg-[#5C6AC4]/10 px-2 py-1 text-xs font-semibold text-[#5C6AC4]">
                      {t.pricing.mostPopular}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnual}
                  <span className="ml-1 text-sm font-medium text-[var(--t2)]">/mo</span>
                </p>
                <div className="mt-5 space-y-2 text-sm text-[var(--t2)]">
                  <p>{t.pricing.rows.orgDepth}: {plan.orgDepth}</p>
                  <p>{t.pricing.rows.activeBets}: {plan.activeBets}</p>
                  <p>{t.pricing.rows.coachCredits}: {plan.coachCredits}</p>
                  <p>{t.pricing.rows.strategicCoach}: {plan.strategicCoach}</p>
                  <p>{t.pricing.rows.closeSprint}: {plan.closeSprint}</p>
                  <p>{t.pricing.rows.support}: {plan.support}</p>
                </div>
                <Link
                  href="/auth/signup"
                  className={`mt-6 block rounded-full px-4 py-2 text-center text-sm font-semibold ${
                    plan.popular ? "bg-[#5C6AC4] text-white" : "border border-black/10 text-[var(--text)]"
                  }`}
                >
                  {t.pricing.getStarted}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#1a1a2e] px-6 py-14 text-center text-white sm:px-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/75 sm:text-lg">{t.finalCta.subtitle}</p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1a1a2e]"
          >
            {t.finalCta.cta}
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-lg font-bold text-[#5C6AC4]">Sprintal</p>
            <p className="mt-1 text-sm text-[var(--t2)]">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--t2)]">
            <a href="#pricing" className="hover:text-[var(--text)]">{t.footer.pricing}</a>
            <Link href="/auth/login" className="hover:text-[var(--text)]">{t.footer.signIn}</Link>
            <Link href="/auth/signup" className="hover:text-[var(--text)]">{t.footer.signUp}</Link>
          </div>
          <div className="flex items-center gap-2">
            {(["en", "es", "pt"] as LandingLocale[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`rounded-full px-2 py-1 text-xs font-medium uppercase ${
                  locale === lang ? "bg-[#5C6AC4] text-white" : "text-[var(--t2)] hover:text-[var(--text)]"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
        <div className="pb-8 text-center text-xs text-[var(--t2)]">{t.footer.copyright}</div>
      </footer>
    </main>
  );
}

import { Link } from 'react-router-dom';

const BUDGET_TIERS = [
  {
    amount: 5,
    tag: 'Chollos',
    subtitle: 'Indies y clásicos',
    cardBg: 'bg-gradient-to-br from-[#FF2A5F] via-[#E11D48] to-[#9F1239]',
    borderClass: 'border-[#FF2A5F]/40 hover:border-[#FFC700]',
    glowClass: 'hover:shadow-[0_18px_36px_rgba(255,42,95,0.32)]',
    badgeClass: 'bg-[#FFC700] text-[#0F172A]',
    orbClass: 'bg-[#FFC700]/25',
  },
  {
    amount: 10,
    tag: 'Popular',
    subtitle: 'Éxitos en oferta',
    cardBg: 'bg-gradient-to-br from-[#4F46E5] via-[#3730A3] to-[#1E1B4B]',
    borderClass: 'border-[#6366F1]/40 hover:border-[#38BDF8]',
    glowClass: 'hover:shadow-[0_18px_36px_rgba(79,70,229,0.32)]',
    badgeClass: 'bg-white/15 text-white border border-white/25',
    orbClass: 'bg-[#38BDF8]/25',
  },
  {
    amount: 15,
    tag: 'Top Valor',
    subtitle: 'Grandes aventuras',
    cardBg: 'bg-gradient-to-br from-[#7C3AED] via-[#5B21B6] to-[#2E1065]',
    borderClass: 'border-[#A78BFA]/40 hover:border-[#F472B6]',
    glowClass: 'hover:shadow-[0_18px_36px_rgba(124,58,237,0.32)]',
    badgeClass: 'bg-white/15 text-white border border-white/25',
    orbClass: 'bg-[#F472B6]/25',
  },
  {
    amount: 20,
    tag: 'Premium',
    subtitle: 'Ediciones completas',
    cardBg: 'bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81]',
    borderClass: 'border-[#FFC700]/45 hover:border-[#FFC700]',
    glowClass: 'hover:shadow-[0_18px_36px_rgba(30,27,75,0.38)]',
    badgeClass: 'bg-[#FFC700] text-[#0F172A]',
    orbClass: 'bg-[#FFC700]/20',
  },
] as const;

export function BudgetSection() {
  return (
    <section
      data-testid="home-budget-section"
      aria-labelledby="budget-section-title"
      className="space-y-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full bg-[#FF2A5F]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#1E1B4B]">
            Explorar por Precio
          </span>
        </div>
        <h2
          id="budget-section-title"
          className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[#0F172A]"
        >
          ¿Cuál es tu presupuesto?
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {BUDGET_TIERS.map(
          ({ amount, tag, subtitle, cardBg, borderClass, glowClass, badgeClass, orbClass }) => (
            <Link
              key={amount}
              to={`/games?maxPrice=${amount}`}
              data-testid={`budget-card-${amount}`}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 ${cardBg} ${borderClass} ${glowClass}`}
            >
              {/* Brillo ambiental */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${orbClass}`}
              />

              {/* Reflejo superior sutil */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
              />

              {/* Motivo decorativo de precio */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -bottom-5 select-none font-black text-7xl sm:text-8xl leading-none text-white/[0.08] transition-transform duration-300 group-hover:scale-110 group-hover:text-white/[0.14]"
              >
                ${amount}
              </span>

              {/* Fila superior: etiqueta HASTA y badge */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-white/80">
                  Hasta
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs ${badgeClass}`}
                >
                  {tag}
                </span>
              </div>

              {/* Fila inferior: precio grande + subtítulo + botón flecha */}
              <div className="relative z-10 mt-4 flex items-end justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xs">
                    ${amount}
                  </div>
                  <p className="text-[11px] font-medium text-white/75">
                    {subtitle}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur-xs transition-all duration-200 group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-[#0F172A]"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

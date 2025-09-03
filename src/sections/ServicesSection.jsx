import { useEffect, useRef } from "react";
import { openWA } from "../utils/wa";
// 🔎 Tirei o logo para evitar qualquer quebra por caminho incorreto.
// Se quiser usar, descomente a linha abaixo e ajuste o caminho:
// import VisuartLogo from "../assets/visuart.png";

const services = [
  { key: "letreiros",   title: "Letreiros Luminosos",   emoji: "💡", blurb: "Sinalização que brilha 24h, alto impacto visual." },
  { key: "fachadas",    title: "Fachadas Corporativas", emoji: "🏢", blurb: "Presença marcante para sua marca no ponto físico." },
  { key: "banners",     title: "Banners Publicitários", emoji: "📢", blurb: "Destaque sua campanha em pontos estratégicos." },
  { key: "adesivos",    title: "Adesivos Personalizados", emoji: "🖇️", blurb: "Personalização total para vitrines e interiores." },
  { key: "plotagem",    title: "Plotagem de Veículos",  emoji: "🚗", blurb: "Seu carro vira um outdoor móvel premium." },
  { key: "sinalizacao", title: "Sinalização Interna",   emoji: "🅿️", blurb: "Fluxo orientado com estilo e clareza." },
];

export default function ServicesSection() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll("[data-reveal]"));

    // Se usuário prefere menos motion, mostra tudo já.
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }

    let shownAny = false;
    const io = "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add("in");
                io.unobserve(e.target);
                shownAny = true;
              }
            });
          },
          { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
        )
      : null;

    // Observa
    items.forEach((el) => {
      if (io) io.observe(el);
      else el.classList.add("in"); // fallback se não houver IO
    });

    // ⛑️ Fallback extra: se após 700ms nada apareceu (layout/overflow), mostra tudo.
    const safety = setTimeout(() => {
      if (!shownAny) items.forEach((el) => el.classList.add("in"));
    }, 700);

    return () => {
      clearTimeout(safety);
      if (io) io.disconnect();
    };
  }, []);

  return (
    <section id="servicos" ref={rootRef} className="py-16 sm:py-20 px-4 bg-white relative">
      {/* halo discreto no topo da seção */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-48"
        style={{
          background:
            "radial-gradient(320px 180px at 15% 30%, rgba(255,183,3,.22), transparent 70%)," +
            "radial-gradient(280px 200px at 85% 30%, rgba(215,38,56,.18), transparent 70%)",
          filter: "blur(18px)",
        }}
      />

      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho simples */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {/* Descomente se usar logo:
          <img src={VisuartLogo} alt="Visuart" className="h-10 w-auto opacity-90 select-none" draggable="false" />
          */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Nossos <span className="bg-gradient-to-r from-[#ffb703] to-[#d72638] bg-clip-text text-transparent">Serviços</span>
          </h2>
        </div>

        {/* Grid responsivo — compacto no mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
          {services.map((s, i) => (
            <article
              key={s.key}
              data-reveal
              className="reveal group relative rounded-xl border border-[var(--vz-border)] bg-white overflow-hidden"
              style={{ transitionDelay: `${Math.min(i * 70, 280)}ms` }}
            >
              {/* borda/halo ativo no hover */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(180deg, rgba(255,183,3,.22), rgba(215,38,56,.16))",
                  boxShadow: "0 12px 28px rgba(255,183,3,.20), 0 12px 30px rgba(215,38,56,.18) inset",
                }}
              />

              <div className="relative p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="text-xl sm:text-2xl select-none">{s.emoji}</div>
                  <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 leading-tight">
                    {s.title}
                  </h3>
                </div>

                <p className="mt-2 text-[11px] sm:text-xs text-slate-600 leading-snug">
                  {s.blurb}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => openWA(s.key)}
                    className="flex-1 sm:flex-none px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg
                               bg-gradient-to-b from-[rgba(255,183,3,.22)] to-[rgba(255,183,3,.14)]
                               border border-[#ffb703B3] text-amber-900 hover:scale-[1.02]
                               transition-transform hover:shadow-[0_10px_22px_rgba(255,183,3,.26)]"
                    aria-label={`Pedir orçamento: ${s.title}`}
                  >
                    Pedir orçamento
                  </button>

                  <a
                    href="#contato"
                    className="px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg
                               border border-[#d72638B3] text-[#7f0f1a] bg-gradient-to-b from-[rgba(215,38,56,.10)] to-[rgba(215,38,56,.06)]
                               hover:scale-[1.02] transition-transform hover:shadow-[0_10px_22px_rgba(215,38,56,.24)]"
                  >
                    Detalhes
                  </a>
                </div>
              </div>

              <div
                className="absolute left-0 bottom-0 h-[3px] w-0 group-hover:w-full transition-all duration-300"
                style={{ background: "linear-gradient(90deg,#ffb703,#d72638)" }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

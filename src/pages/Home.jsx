// src/pages/Home.jsx
// ❌ sem useEffect pra evitar o erro de hook
import Header from "../components/Header";
// Se o arquivo real for "Footer.jsx", troque o import abaixo:
import Footer from "../components/footer";
import MapView from "../components/MapView";
import OutdoorList from "../components/OutdoorList";
import { initReveal } from "../lib/reveal";
import BrandDotLottie from "../components/BrandDotLottie";
import Btn from "../components/Btn";

/* ---- dispara o initReveal sem hooks, de forma segura ---- */
(function initRevealOnLoad() {
  if (typeof window === "undefined") return;
  const run = () => {
    try { initReveal?.(); } catch (e) { console.warn("initReveal falhou:", e); }
  };
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(run, 0);
  } else {
    window.addEventListener("DOMContentLoaded", run, { once: true });
  }
})();

/* Utilitários visuais do hero (mantidos caso use em outros lugares) */
function Dots({ className = "" }) {
  return <div className={`vz-dots ${className}`} />;
}
function Blob({ className = "", from = "#FFC300", to = "#ff7a00" }) {
  return (
    <div
      className={`vz-blob ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    />
  );
}

/* Section com container consistente */
function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`relative py-12 md:py-18 ${className}`}>
      <div className="container mx-auto px-4 max-w-6xl">{children}</div>
    </section>
  );
}


export default function Home() {
  // dados dos serviços (inline)
  const services = [
    { key: "letreiros",   title: "Letreiros Luminosos",   emoji: "💡", blurb: "Sinalização que brilha 24h, alto impacto visual." },
    { key: "fachadas",    title: "Fachadas Corporativas", emoji: "🏢", blurb: "Presença marcante para sua marca no ponto físico." },
    { key: "banners",     title: "Banners Publicitários", emoji: "📢", blurb: "Destaque sua campanha em pontos estratégicos." },
    { key: "adesivos",    title: "Adesivos Personalizados", emoji: "🖇️", blurb: "Personalização total para vitrines e interiores." },
    { key: "plotagem",    title: "Plotagem de Veículos",  emoji: "🚗", blurb: "Seu carro vira um outdoor móvel premium." },
    { key: "sinalizacao", title: "Sinalização Interna",   emoji: "🅿️", blurb: "Fluxo orientado com estilo e clareza." },
  ];

  const openWA = (serviceKey = "") => {
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no serviço: ${serviceKey.toUpperCase()}. Pode me enviar mais informações?`
    );
    window.open(`https://wa.me/5532999831313?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-vz-bg text-vz-text">
      <Header />

      {/* ========== HERO (limpo + sem fundo, sem corte) ========== */}
      <section className="relative reveal clip-x" data-reveal>
        <div className="container mx-auto px-4 max-w-6xl pt-20 md:pt-28 pb-14 md:pb-22">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
            {/* TEXTO (ESQUERDA) */}
            <div>
              <h1 className="text-2xl md:text-5xl font-extrabold leading-tight">
                Tá querendo aparecer?
                <br />
                <span className="text-[1.2em]" style={{ color: "var(--vz-primary)" }}>
                  Seu negócio espalhado por toda a cidade, que tal?
                </span>
              </h1>

              <div className="mt-5 flex gap-3">
                <Btn href="#mapa" variant="primary" className="text-sm md:text-base">
                  Ver mapa
                </Btn>
                <Btn href="#servicos" variant="secondary" className="text-sm md:text-base">
                  Nossos Serviços
                </Btn>
              </div>
            </div>

            {/* ANIMAÇÃO (DIREITA) — sem fundo, responsiva, sem corte */}
            <div className="order-first md:order-none flex justify-center md:justify-end">
              <div
                className="w-full max-w-[640px]"
                style={{ height: "min(60vh, 400px)", overflow: "visible" }}
              >
                <dotlottie-wc
                  src="https://lottie.host/cb0aa69d-f3ea-42e4-839a-c48eca54b812/GuTiypF6oQ.lottie"
                  autoplay
                  loop
                  speed="1"
                  background="transparent"
                  style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
                ></dotlottie-wc>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SERVIÇOS ========== */}
      <section id="servicos" className="py-16 sm:py-20 px-4 bg-white relative">
        {/* halo discreto */}
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
          <div className="flex items-center justify-center gap-3 mb-10">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Nossos{" "}
              <span className="bg-gradient-to-r from-[#ffb703] to-[#d72638] bg-clip-text text-transparent">
                Serviços
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
            {/* ESQUERDA: Lottie */}
            <BrandDotLottie
              src="https://lottie.host/d78c974d-db3b-4d9a-8a90-96fcefa10fe8/4nPcO3JaMA.lottie"
              ariaLabel="Aumente sua visibilidade com mídia exterior"
              speed={1}
              loop
              autoplay
            />

            {/* DIREITA: Texto de impacto */}
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Alcance certo, <span className="text-[#d72638]">números que crescem</span>
              </h3>
              <p className="mt-3 text-slate-600">
                Anunciando com a Visuart, sua marca aparece nos locais de maior fluxo da
                cidade — veja no mapa interativo os melhores pontos. Resultado?
                Mais lembrança, mais visitas e mais vendas.
              </p>
            </div>
          </div>

          {/* Cards de serviços */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
            {services.map((s, i) => (
              <article
                key={s.key}
                className="group relative rounded-xl border border-[var(--vz-border)] bg-white overflow-hidden"
                style={{ transitionDelay: `${Math.min(i * 70, 280)}ms` }}
              >
                {/* halo no hover */}
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

                {/* botões do card de serviço */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Btn
                      size="sm"
                      variant="secondary"                 // âmbar (Whats/lead)
                      className="w-full text-nowrap"
                      onClick={() => openWA(s.key)}
                      aria-label={`Pedir orçamento: ${s.title}`}
                      title="Pedir orçamento"
                    >
                      Orçamento
                    </Btn>

                    <Btn
                      size="sm"
                      variant="primary"                   // vermelho
                      href="#contato"
                      className="w-full text-nowrap"
                      title="Detalhes do serviço"
                    >
                      Detalhes
                    </Btn>
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

      {/* ========== MAPA + LISTA ========== */}
      <Section id="mapa" className="pt-2 md:pt-6">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <h3 className="text-lg md:text-2xl font-extrabold">Mapa de Outdoors</h3>
          <Btn href="#lista-outdoors" variant="secondary" className="text-sm md:text-base">
            Ver lista
          </Btn>
        </div>

        <div className="reveal" data-reveal>
          <MapView />
        </div>

        <div id="lista-outdoors" className="mt-8 md:mt-10 reveal" data-reveal>
          <h4 className="text-base md:text-xl font-extrabold mb-3 md:mb-4">
            Lista de Outdoors
          </h4>
          {/* Se tiver botões aqui, reaproveite <Btn /> também */}
          <OutdoorList />
        </div>
      </Section>

      <Footer />
    </div>
  );
}

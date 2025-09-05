// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import logo from "../assets/visuart.png";

/* ========= WHATSAPP ========= */
const WAPP = "5532984685261"; // Coloque aqui o MESMO número do seu bot/atendente (apenas dígitos, com 55)
const waLink = (text) => `https://wa.me/${WAPP}?text=${encodeURIComponent(text)}`;

export default function Header(){
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  return (
    <header className="site-header fixed top-0 left-0 right-0 z-50">
      <div className={`header-shell ${compact ? "compact" : ""} bg-white/90 backdrop-blur-md border-b border-vz-border`}>
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 min-w-0">
            {logo ? (
              <img src={logo} alt="Visuart" className="h-7 w-auto logo-shrink" />
            ) : (
              <span className="font-extrabold text-lg">VISUART</span>
            )}
          </a>

          {/* Desktop — agora usando os botões estilizados */}
          <nav className="hidden sm:flex items-center gap-2 md:gap-3">
            <a href="#mapa" className="learn-more is-red">Mapa</a>
            <a href="#lista-outdoors" className="learn-more is-yellow">Outdoors</a>
            <a
              href={waLink("Olá! Vim do site (Header > Contato). Pode me ajudar?")}
              className="learn-more is-yellow"
              target="_blank" rel="noopener noreferrer"
            >
              Contato
            </a>
          </nav>

          {/* Mobile hamburger */}
          <button
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="hamb sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl2 border border-vz-border hover-boost"
            onClick={() => setOpen(v => !v)}
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="#111827" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile drawer (pode manter os estilos mobile atuais) */}
        <div className={`sm:hidden ${open ? "block" : "hidden"}`}>
          <nav className="max-w-6xl mx-auto px-4 py-3 grid gap-2 text-base animate-mobileDrop origin-top bg-white">
            <a href="#sobre" onClick={()=>setOpen(false)} className="mobile-item">Quem somos</a>
            <a href="#mapa" onClick={()=>setOpen(false)} className="mobile-item">Mapa</a>
            <a href="#lista-outdoors" onClick={()=>setOpen(false)} className="mobile-item">Outdoors</a>

            <div className="mt-2 grid grid-cols-2 gap-8 px-1">
              <a href="#mapa" onClick={()=>setOpen(false)} className="mobile-ghost-btn">Ver mapa</a>
              <a
                href={waLink("Olá! Vim do site (Menu Mobile > Contato). Pode me ajudar?")}
                onClick={()=>setOpen(false)}
                className="mobile-cta-btn hover-boost hover-boost-yellow"
                target="_blank" rel="noopener noreferrer"
              >
                Contato
              </a>
            </div>
          </nav>
        </div>
      </div>

      <div
        className={`sm:hidden mobile-overlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </header>
  );
}

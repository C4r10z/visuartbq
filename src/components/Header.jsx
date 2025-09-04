// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import logo from "../assets/visuart.png";
import Btn from "./Btn";

export default function Header(){
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // trava scroll do body quando o menu móvel está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  // helper pra fechar o menu ao navegar no mobile
  const closeAnd = (fn) => (...args) => { fn?.(...args); setOpen(false); };

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

          {/* Desktop */}
          <nav className="hidden sm:flex items-center gap-2 md:gap-3">
            {/* CTAs padronizados com os MESMOS botões da página */}
            <Btn href="#mapa" size="sm" variant="primary" className="!min-w-[auto]">
              Ver mapa
            </Btn>
            <Btn href="#contato" size="sm" variant="secondary" className="!min-w-[auto]">
              Contato
            </Btn>
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

        {/* Mobile drawer */}
        <div className={`sm:hidden ${open ? "block" : "hidden"}`}>
          <nav className="max-w-6xl mx-auto px-4 py-3 grid gap-2 text-base animate-mobileDrop origin-top bg-white">
            <a href="#mapa" onClick={closeAnd()} className="mobile-item">Mapa</a>
            <a href="#lista-outdoors" onClick={closeAnd()} className="mobile-item">Outdoors</a>

            <div className="mt-2 grid grid-cols-2 gap-3 px-1">
              {/* Mesmos botões também no mobile */}
              <Btn href="#mapa" size="sm" variant="primary" className="w-full" onClick={closeAnd()}>
                Ver mapa
              </Btn>
              <Btn href="#contato" size="sm" variant="secondary" className="w-full" onClick={closeAnd()}>
                Contato
              </Btn>
            </div>
          </nav>
        </div>
      </div>

      {/* Fundo/overlay do menu mobile */}
      <div
        className={`sm:hidden mobile-overlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </header>
  );
}

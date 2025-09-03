let observer;

export function initReveal(root = document) {
  if (typeof window === "undefined") return;
  const els = Array.from(root.querySelectorAll("[data-reveal]"));
  if (!els.length) return;

  // Fallback se o navegador não suporta IO
  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("in"));
    return;
  }

  // rootMargin com "faixa de segurança" pra disparar ANTES do card entrar totalmente
  //  => entra ~20% antes e mantém ~15% depois (bom no mobile)
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        observer.unobserve(e.target);
      }
    }
  }, { rootMargin: "20% 0px 15% 0px", threshold: 0.06 });

  // Marca e observa
  els.forEach((el, i) => {
    if (!el.classList.contains("reveal")) el.classList.add("reveal");
    // pequeno stagger só pra dar ritmo
    el.style.transitionDelay = `${Math.min(i, 6) * 35}ms`;
    observer.observe(el);
  });
}

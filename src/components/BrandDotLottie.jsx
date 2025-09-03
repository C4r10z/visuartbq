// src/components/BrandDotLottie.jsx
export default function BrandDotLottie({
  src,
  ariaLabel = "Animação de marca",
  speed = 1,
  loop = true,
  autoplay = true,
  className = "",
}) {
  // Para web components, a presença do atributo já ativa (autoplay/loop)
  const boolAttr = (val) => (val ? "" : undefined);

  return (
    <div
      className={[
        // largura cheia no mobile, limita para não ficar gigante
        "relative w-full max-w-[420px] md:max-w-[520px]",
        // mantém formato quadrado (acaba com “alto e magro”)
        "aspect-square",
        // centraliza no mobile, alinha à esquerda no desktop
        "mx-auto md:mx-0",
        className,
      ].join(" ")}
    >
      <dotlottie-wc
        src={src}
        autoplay={boolAttr(autoplay)}
        loop={boolAttr(loop)}
        speed={String(speed)}
        aria-label={ariaLabel}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          // fundo transparente (se sua arte permitir)
          background: "transparent",
        }}
      />
    </div>
  );
}

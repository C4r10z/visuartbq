// src/components/Btn.jsx
export default function Btn({
  href,
  children,
  variant = "primary", // "primary" = vermelho | "secondary" = amarelo
  size = "md",         // "md" = CTAs do topo | "sm" = cards
  className = "",
  style = {},
  ...props
}) {
  const sizeMap = {
    md: "px-5 py-3 text-sm md:text-base",
    sm: "px-3 py-2 text-[10px] sm:text-[11px]",
  };

  const baseClasses =
    `inline-flex items-center justify-center rounded-xl2 font-extrabold ${sizeMap[size]} ` +
    (variant === "primary" ? "hover-boost hover-boost-red" : "hover-boost hover-boost-yellow");

  const baseStyle = { border: "1px solid rgba(0,0,0,.06)", ...style };

  const variantStyle =
    variant === "primary"
      ? {
          background: "linear-gradient(180deg, rgba(229,23,23,1), rgba(196,17,17,1))",
          color: "#fff",
          boxShadow: "var(--vz-glow-red)",
        }
      : {
          background: "linear-gradient(180deg, rgba(255,195,0,.55), rgba(255,195,0,.32))",
          color: "#1f2937",
          border: "1px solid rgba(255,195,0,.9)",
        };

  const mergedStyle = { ...baseStyle, ...variantStyle };

  if (href) {
    return (
      <a href={href} className={`${baseClasses} ${className}`} style={mergedStyle} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button className={`${baseClasses} ${className}`} style={mergedStyle} {...props}>
      {children}
    </button>
  );
}

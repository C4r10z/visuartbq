// src/components/Btn.jsx
/**
 * Variants:
 *  - primary   => vermelho  (classe: is-red)
 *  - secondary => amarelo   (classe: is-yellow)
 *
 * Sizes:
 *  - md (padrão) => igual ao CTA base
 *  - sm          => versão menor (cards, etc.)
 */
export default function Btn({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const variantClass = variant === "secondary" ? "is-yellow" : "is-red";
  const sizeClass = size === "sm" ? "is-sm" : "is-md";
  const Comp = href ? "a" : "button";

  return (
    <Comp
      href={href}
      className={`learn-more ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
}

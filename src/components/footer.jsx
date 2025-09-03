import React from "react";

export default function Footer(){
  return (
    <footer className="mt-20 border-t border-vz-border">
      <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-vz-muted">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Visuart — Todos os direitos reservados.</p>
          <p>Feito com ❤ em Barbacena.</p>
        </div>
      </div>
    </footer>
  )
}

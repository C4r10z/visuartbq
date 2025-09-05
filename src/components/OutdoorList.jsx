import React, { useEffect, useState } from "react";
import { outdoorLocations } from "../data/Locations";
import { waOutdoorMsg } from "../utils/wa";
import { initReveal } from "../lib/reveal";
import Btn from "./Btn";

function googleMapsUrl(pos){
  if (!Array.isArray(pos)) return "#";
  return `https://www.google.com/maps/search/?api=1&query=${pos[0]},${pos[1]}`;
}

/** Carousel simples que troca as imagens automaticamente */
function AutoSwapImage({ images = [], alt = "", intervalMs = 3800 }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return; // nada a fazer com 0/1 imagem
    // pré-carrega as próximas
    images.slice(1).forEach(src => { const i = new Image(); i.src = src; });
    const id = setInterval(() => setIdx((p) => (p + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images, intervalMs]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full grid place-items-center text-sm text-vz-muted">
        Sem imagem
      </div>
    );
  }

  // container com a mesma proporção usada antes
  return (
    <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden">
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={alt}
          aria-hidden={i !== idx}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
          loading={i === 0 ? "lazy" : "eager"}
          decoding="async"
        />
      ))}
    </div>
  );
}

export default function OutdoorList(){
  useEffect(() => { initReveal(); }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {outdoorLocations.map((o) => {
        return (
          <article
            key={o.id}
            className="bg-white border border-vz-border rounded-2xl overflow-hidden shadow-soft hover:shadow-xl hover-boost transition reveal"
            data-reveal
            style={{ boxShadow: "0 8px 18px rgba(15,23,42,.05)" }}
          >
            {/* Imagem / Carousel */}
            <div className="relative bg-slate-100">
              <AutoSwapImage images={o.images} alt={o.name} />

              {/* Etqueta (#id) âmbar discreta */}
              <div
                className="absolute top-2 left-2 px-2 py-1 text-[11px] font-semibold rounded-md border"
                style={{ background:"rgba(255,183,3,.92)", color:"#1f2937", borderColor:"rgba(0,0,0,.06)" }}
              >
                #{o.id}
              </div>
            </div>

            {/* Texto + ações */}
            <div className="p-3">
              <h4 className="font-semibold leading-snug text-[15px]">{o.name}</h4>
              <p className="text-[13px] text-vz-muted mt-1 line-clamp-2">{o.address || "—"}</p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Btn
                  href={googleMapsUrl(o.position)}
                  variant="primary"
                  size="sm"
                  className="w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir no Google Maps"
                >
                  Google Maps
                </Btn>

                <Btn
                  href={waOutdoorMsg(o)}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Falar no WhatsApp"
                >
                  WhatsApp
                </Btn>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

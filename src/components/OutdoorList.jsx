import React, { useEffect } from "react";
import { outdoorLocations } from "../data/Locations";
import { waOutdoorMsg } from "../utils/wa";
import { initReveal } from "../lib/reveal";
import Btn from "./Btn";

function googleMapsUrl(pos){
  if (!Array.isArray(pos)) return "#";
  return `https://www.google.com/maps/search/?api=1&query=${pos[0]},${pos[1]}`;
}

export default function OutdoorList(){
  useEffect(() => { initReveal(); }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {outdoorLocations.map((o) => {
        const img = Array.isArray(o.images) ? o.images[0] : null;

        return (
          <article
            key={o.id}
            className="bg-white border border-vz-border rounded-2xl overflow-hidden shadow-soft hover:shadow-xl hover-boost transition reveal"
            data-reveal
            style={{ boxShadow: "0 8px 18px rgba(15,23,42,.05)" }}
          >
            {/* Imagem */}
            <div className="relative bg-slate-100">
              <div className="aspect-[4/3] sm:aspect-[16/9]">
                {img ? (
                  <img
                    src={img}
                    alt={o.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-sm text-vz-muted">
                    Sem imagem
                  </div>
                )}
              </div>

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

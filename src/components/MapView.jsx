import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import polyline from "@mapbox/polyline";
import { outdoorLocations } from "../data/Locations";
import { waOutdoorMsg } from "../utils/wa";
import { on } from "../lib/eventBus";
import Btn from "./Btn";

const createUserIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;
      background:#2563eb;border:2px solid #fff;box-shadow:0 0 6px rgba(37,99,235,.6)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  });

const createOutdoorIcon = () =>
  L.divIcon({
    className: "modern-marker",
    html: `<div class="marker-container"><div class="pulse-effect"></div><div class="marker-core"></div></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28],
  });

const MAX_ROUTE_POINTS = 1200;
const isValidCoord = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180;
const downsample = (arr,max)=>{ if(arr.length<=max)return arr; const s=Math.ceil(arr.length/max); const r=[]; for(let i=0;i<arr.length;i+=s) r.push(arr[i]); if(r[0]!==arr[0]) r.unshift(arr[0]); if(r[r.length-1]!==arr[arr.length-1]) r.push(arr[arr.length-1]); return r; };

const MAP_BOUNDS = { southWest: [-21.25, -43.81], northEast: [-21.19, -43.73] };
const fallbackLocation = [-21.224643, -43.772096];

/** ---- Carrossel simples para o POPUP (auto-rotate) ---- */
function AutoSwapImage({ images = [], alt = "", intervalMs = 2800, height = 150, radius = 8 }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    // pré-carrega as seguintes
    images.slice(1).forEach(src => { const i = new Image(); i.src = src; });
    const id = setInterval(() => setIdx((p) => (p + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images, intervalMs]);

  if (!images || images.length === 0) {
    return (
      <div
        style={{ width: "100%", height, borderRadius: radius }}
        className="grid place-items-center text-sm text-vz-muted"
      >
        Sem imagem
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: "100%", height, borderRadius: radius }}
      onClick={(e) => e.stopPropagation()} // evita fechar o popup
    >
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
          draggable="false"
        />
      ))}
    </div>
  );
}

export default function MapView({ className = "", height = undefined }) {
  const [expanded, setExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);

  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const pendingPopupId = useRef(null);
  const maxBounds = useMemo(() => [MAP_BOUNDS.southWest, MAP_BOUNDS.northEast], []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        const inside = coords[0]>=MAP_BOUNDS.southWest[0] && coords[0]<=MAP_BOUNDS.northEast[0] &&
                       coords[1]>=MAP_BOUNDS.southWest[1] && coords[1]<=MAP_BOUNDS.northEast[1];
        setUserLocation(inside ? coords : fallbackLocation);
      },
      () => setUserLocation(fallbackLocation),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const t = setTimeout(() => { try { mapRef.current?.invalidateSize(); } catch {} }, 150);
    return () => clearTimeout(t);
  }, [expanded]);

  useEffect(() => {
    const un = on("focusOutdoor", (id) => {
      const o = outdoorLocations.find((s) => s.id === id); if (!o) return;
      if (!expanded) setExpanded(true);
      setTimeout(() => {
        try { markerRefs.current[o.id]?.openPopup(); } catch {}
        pendingPopupId.current = o.id;
        mapRef.current?.flyTo(o.position, 16, { duration: 0.6 });
        mapRef.current?.once("moveend", () => {
          const pid = pendingPopupId.current; if (pid) { try { markerRefs.current[pid]?.openPopup(); } catch {} }
        });
      }, 220);
    });
    return () => un();
  }, [expanded]);

  const drawRouteTo = async (destLatLng) => {
    setRouteCoords([]);
    if (!userLocation || !Array.isArray(destLatLng)) return;
    try {
      const [ulat, ulng] = userLocation;
      const [olat, olng] = destLatLng;
      const url = `https://router.project-osrm.org/route/v1/driving/${ulng},${ulat};${olng},${olat}?overview=simplified&geometries=polyline`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = await res.json();
      if (!data?.routes?.length) return;
      const raw = polyline.decode(data.routes[0].geometry);
      let clean = []; let pL=null,pG=null;
      for (const [lat,lng] of raw) { if (!isValidCoord(lat,lng)) continue; if (lat===pL && lng===pG) continue; clean.push([lat,lng]); pL=lat; pG=lng; }
      clean = downsample(clean, MAX_ROUTE_POINTS);
      if (clean.length>1) setRouteCoords(clean);
    } catch (err) { console.warn("Falha rota:", err?.message || err); }
  };

  const stopEvt = (e) => { if (e?.originalEvent) L.DomEvent.stop(e.originalEvent); };
  const handleOutdoorClick = (o, e) => {
    if (e?.originalEvent) L.DomEvent.stop(e.originalEvent);
    try { markerRefs.current[o.id]?.openPopup(); } catch {}
    pendingPopupId.current = o.id;
    mapRef.current?.flyTo(o.position, 16, { duration: 0.6 });
    mapRef.current?.once("moveend", () => {
      const id = pendingPopupId.current; if (id) { try { markerRefs.current[id]?.openPopup(); } catch {} }
    });
    drawRouteTo(o.position).finally(() => {
      const id = pendingPopupId.current; if (id) setTimeout(() => { try { markerRefs.current[id]?.openPopup(); } catch {} }, 0);
    });
  };

  const commonMapProps = {
    maxBounds, maxBoundsViscosity: 1.0, preferCanvas: true,
    updateWhenDragging: false, updateWhenIdle: true,
    wheelPxPerZoomLevel: 110, keepBuffer: 4,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
  };

  const lockedOpts = { dragging:false, touchZoom:false, doubleClickZoom:false, scrollWheelZoom:false, boxZoom:false, keyboard:false };
  const computedHeight = height ?? "clamp(360px, 64vh, 620px)";

  const MapInner = () => (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap'
      />

      {userLocation && <Marker position={userLocation} icon={createUserIcon()} />}

      {routeCoords.length>0 && (
        <>
          <Polyline positions={routeCoords} pathOptions={{ opacity:.7 }} className="route-glow" />
          <Polyline positions={routeCoords} pathOptions={{ color:"#d72638", weight:5, opacity:.9 }} className="route-core" />
          <Polyline positions={routeCoords} pathOptions={{ color:"#ffb703", weight:2.5, opacity:.95 }} className="route-dash" />
        </>
      )}

      {outdoorLocations.map((o) => (
        <Marker
          key={o.id}
          position={o.position}
          icon={createOutdoorIcon()}
          riseOnHover
          eventHandlers={{ mousedown: stopEvt, touchstart: stopEvt, click: (e) => handleOutdoorClick(o, e) }}
          ref={(instance) => { if (instance) markerRefs.current[o.id] = instance; }}
        >
          <Popup className="custom-popup" closeButton={false} keepInView autoPan autoClose={false} closeOnClick={false} offset={[0,-18]}>
            <div style={{ width: 300, maxWidth: "90vw" }} onClick={(e)=>e.stopPropagation()}>
              <div style={{ borderRadius: 12, padding: 2, background: "linear-gradient(45deg, rgba(255,183,3,.45), rgba(215,38,56,.28))", boxShadow: "0 12px 28px rgba(0,0,0,.16)" }}>
                <div style={{ background:"#fff", borderRadius: 10, padding: 12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap: 8, marginBottom: 8 }}>
                    <h3 style={{ color:"#111827", fontWeight: 800, fontSize: 16, margin: 0 }}>{o.name}</h3>
                    <button
                      onClick={(ev)=>{ ev.stopPropagation(); pendingPopupId.current=null; try{ markerRefs.current[o.id]?.closePopup(); }catch{} }}
                      title="Fechar"
                      style={{ width: 40, height: 40, borderRadius: 10, border:"1px solid #d72638", color:"#d72638", fontSize: 18, fontWeight: 900, background:"#fff" }}
                    >×</button>
                  </div>

                  {/* === CARROSSEL AUTO (troca sozinho) === */}
                  <AutoSwapImage images={o.images} alt={o.name} intervalMs={2800} height={150} radius={8} />

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderTop:"1px solid #f3f4f6", borderBottom:"1px solid #f3f4f6" }}>
                    <span style={{ color:"#6b7280", fontSize: 13 }}>{o.address || "—"}</span>
                    {o.price && (
                      <div style={{ textAlign:"right" }}>
                        <span style={{ color:"#d72638", fontWeight: 800 }}>{o.price}</span>
                        <small style={{ display:"block", color:"#9ca3af" }}>/quinzena</small>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Btn
                      href={waOutdoorMsg(o)}
                      variant="secondary"  // amarelo (WhatsApp)
                      size="sm"
                      className="w-full"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Falar no WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      💬 WhatsApp
                    </Btn>

                    <Btn
                      href={`https://www.google.com/maps/search/?api=1&query=${o.position[0]},${o.position[1]}`}
                      variant="primary"    // vermelho (Maps)
                      size="sm"
                      className="w-full"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no Google Maps"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Google Maps
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );

  return (
    /* Wrapper com overflow visível garante que o halo não seja cortado por pais com overflow:hidden */
    <div className={`relative ${className}`} style={{ overflow: "visible" }}>
      {/* HALOS EXTERNOS (só no modo reduzido) */}
      {!expanded && (
        <div
          className="halo-layer pointer-events-none absolute"
          style={{
            inset: "-36px",
            zIndex: 0,
            overflow: "visible",
            background:
              "radial-gradient(240px 180px at 100% 0%, rgba(255,183,3,.50), transparent 72%)," +
              "radial-gradient(220px 180px at 0% 100%, rgba(215,38,56,.40), transparent 72%)," +
              "linear-gradient(90deg, rgba(255,183,3,.12), rgba(215,38,56,.12))",
            filter: "blur(22px)"
          }}
        />
      )}

      {/* Cartão do mapa (fica acima do halo) */}
      {!expanded && (
        <div
          className="relative z-[1] rounded-2xl overflow-hidden bg-white border border-vz-border"
          style={{ height: computedHeight, boxShadow: "0 16px 40px rgba(15,23,42,.08)" }}
        >
          <div className="relative h-full">
            <MapContainer
              center={[-21.2217, -43.7736]} zoom={14}
              style={{ height:"100%", width:"100%", background:"#fff", touchAction:"manipulation" }}
              whenCreated={(map)=> (mapRef.current = map)}
              className="z-10 relative"
              zoomControl={false} closePopupOnClick={false} tap={false}
              {...commonMapProps} {...lockedOpts}
            >
              <MapInner />
            </MapContainer>

            {/* Overlay expandir */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background:"rgba(255,255,255,.55)", backdropFilter:"blur(1px)", zIndex:2147483647, pointerEvents:"auto" }}
              onClick={(e)=>{ e.stopPropagation(); setExpanded(true); }}
            >
              <button
                type="button" aria-label="Ampliar mapa"
                onClick={(e)=>{ e.stopPropagation(); setExpanded(true); }}
                className="rounded-full px-5 py-3 text-base font-extrabold hover-boost"
                style={{ background:"linear-gradient(180deg, rgba(215,38,56,1), rgba(183,29,43,1))", color:"#fff", border:"1px solid rgba(0,0,0,.06)", boxShadow:"0 16px 32px rgba(215,38,56,.34)" }}
              >
                Toque para ampliar o mapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen sem halos (limpo) */}
      {expanded && (
        <div className="fixed inset-0" style={{ background:"rgba(255,255,255,.94)", backdropFilter:"blur(2px)", zIndex:100000, isolation:"isolate", contain:"paint" }}>
          <button
            onClick={()=>{ pendingPopupId.current=null; setExpanded(false); }}
            aria-label="Fechar mapa"
            className="fixed right-4 md:right-6 z-[100001] h-12 w-12 rounded-full flex items-center justify-center"
            style={{ top:"calc(env(safe-area-inset-top, 0px) + .75rem)", background:"#fff", border:"1px solid #e5e7eb", color:"var(--vz-primary)", boxShadow:"0 8px 20px rgba(0,0,0,.12)", fontWeight:800, fontSize:20 }}
            title="Fechar"
          >×</button>

          <MapContainer
            center={[-21.2217, -43.7736]} zoom={15}
            style={{ height:"100%", width:"100%", background:"#fff", touchAction:"manipulation" }}
            className="relative" zoomControl={false} closePopupOnClick={false} tap={false}
            dragging touchZoom doubleClickZoom scrollWheelZoom boxZoom keyboard
            whenCreated={(map)=> (mapRef.current = map)}
            {...commonMapProps}
          >
            <MapInner />
            <ZoomControl position="bottomright" />
          </MapContainer>
        </div>
      )}
    </div>
  );
}

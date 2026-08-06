import { useEffect, useRef } from "react";
import { Map as CarteGL, Marker as MarqueurGL } from "maplibre-gl";
import type { MapMouseEvent, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { couleurs } from "../theme/tokens";
import { STYLE_SOMBRE } from "./horsLigne";
import type { Marqueur, ProprietesCarte } from "./CarteInteractive";

/**
 * Jumeau web de la carte interactive.
 *
 * Meme interface que la version native, au-dessus de MapLibre GL JS. C'est le
 * MEME moteur de rendu et le MEME fichier de style que sur Android : ce qu'on
 * voit dans le navigateur correspond a ce que verra un utilisateur, aux
 * interactions tactiles pres.
 *
 * On manipule le DOM directement plutot que de passer par des composants React :
 * MapLibre GL JS gere lui-meme son canvas et ses marqueurs, et le laisser faire
 * evite de recreer la carte a chaque rendu.
 */

function elementMarqueur(actif: boolean, initiale: string): HTMLDivElement {
  const el = document.createElement("div");
  const taille = actif ? 58 : 46;
  Object.assign(el.style, {
    width: `${taille}px`,
    height: `${taille}px`,
    borderRadius: "50%",
    background: actif ? couleurs.accent : couleurs.surface2,
    border: `1.5px solid ${actif ? couleurs.accent : couleurs.bordure}`,
    color: actif ? couleurs.surAccent : couleurs.accentDoux,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    font: "600 16px Sora, system-ui, sans-serif",
    cursor: "pointer",
  } satisfies Partial<CSSStyleDeclaration>);
  el.textContent = initiale;
  return el;
}

export function CarteInteractive({
  centre,
  zoom = 14,
  marqueurs = [],
  selection = null,
  onSelectionner,
  onAppui,
  onEchecFond,
  onFondCharge,
  recentrerSur = null,
  marqueurPlacement = null,
}: ProprietesCarte) {
  const conteneur = useRef<HTMLDivElement | null>(null);
  const carte = useRef<CarteGL | null>(null);
  const epingles = useRef<Map<string, MarqueurGL>>(new Map());
  const epinglePlacement = useRef<MarqueurGL | null>(null);

  // Creation unique de la carte.
  useEffect(() => {
    if (!conteneur.current || carte.current) return;

    const instance = new CarteGL({
      container: conteneur.current,
      style: STYLE_SOMBRE as unknown as StyleSpecification,
      center: [centre.longitude, centre.latitude],
      zoom,
      attributionControl: { compact: true },
    });

    instance.on("style.load", () => onFondCharge?.());
    instance.on("error", () => onEchecFond?.());
    instance.on("click", (e: MapMouseEvent) => {
      if (onAppui) {
        onAppui({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
      } else {
        onSelectionner?.("");
      }
    });

    carte.current = instance;

    return () => {
      instance.remove();
      carte.current = null;
      epingles.current.clear();
    };
    // La carte ne doit etre creee qu'une fois : les changements de centre
    // passent par `recentrerSur`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marqueurs : on ne recree que ce qui a change.
  useEffect(() => {
    const instance = carte.current;
    if (!instance) return;

    const vus = new Set<string>();

    for (const m of marqueurs) {
      vus.add(m.id);
      const existante = epingles.current.get(m.id);
      const actif = m.id === selection;
      const initiale = m.icone.slice(0, 1).toUpperCase();

      // MapLibre conserve la reference de son element DOM. Le remplacer avec
      // `replaceWith` rendait l'epingle visuellement correcte mais non
      // cliquable apres une selection. On recree donc proprement son noeud.
      if (existante) {
        existante.remove();
        epingles.current.delete(m.id);
      }

      const el = elementMarqueur(actif, initiale);
      el.addEventListener("click", (evenement) => {
        evenement.stopPropagation();
        onSelectionner?.(m.id);
      });
      const epingle = new MarqueurGL({ element: el })
        .setLngLat([m.longitude, m.latitude])
        .addTo(instance);
      epingles.current.set(m.id, epingle);
    }

    for (const [id, epingle] of epingles.current) {
      if (!vus.has(id)) {
        epingle.remove();
        epingles.current.delete(id);
      }
    }
  }, [marqueurs, selection, onSelectionner]);

  // Recentrage anime.
  useEffect(() => {
    if (!recentrerSur || !carte.current) return;
    carte.current.flyTo({
      center: [recentrerSur.position.longitude, recentrerSur.position.latitude],
      zoom: recentrerSur.zoom ?? zoom,
      duration: 600,
    });
  }, [recentrerSur, zoom]);

  // Epingle de placement manuel.
  useEffect(() => {
    const instance = carte.current;
    if (!instance) return;

    if (!marqueurPlacement) {
      epinglePlacement.current?.remove();
      epinglePlacement.current = null;
      return;
    }

    if (!epinglePlacement.current) {
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        background: couleurs.accent,
        border: `4px solid ${couleurs.bg}`,
      } satisfies Partial<CSSStyleDeclaration>);
      epinglePlacement.current = new MarqueurGL({ element: el }).addTo(
        instance,
      );
    }
    epinglePlacement.current.setLngLat([
      marqueurPlacement.longitude,
      marqueurPlacement.latitude,
    ]);
  }, [marqueurPlacement]);

  return (
    <div
      ref={conteneur}
      style={{
        position: "absolute",
        inset: 0,
        background: couleurs.surface1,
      }}
    />
  );
}

export type { Marqueur };

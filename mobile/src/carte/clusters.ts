import type { Marqueur } from "./CarteInteractive";

export type GroupeCarte = { type: "marqueur"; marqueur: Marqueur } | { type: "cluster"; id: string; latitude: number; longitude: number; total: number; membres: Marqueur[] };

/** Regroupement volontairement léger : pas de dépendance native et un résultat
 * stable sur Android entrée de gamme. Le rayon dépend du zoom courant. */
export function regrouperMarqueurs(marqueurs: Marqueur[], zoom: number): GroupeCarte[] {
  const rayonDegres = 0.016 / Math.max(1, 2 ** (zoom - 12));
  const groupes: Marqueur[][] = [];
  for (const marqueur of marqueurs) {
    const groupe = groupes.find(g => Math.abs(g[0].latitude-marqueur.latitude)<=rayonDegres && Math.abs(g[0].longitude-marqueur.longitude)<=rayonDegres);
    if (groupe) groupe.push(marqueur); else groupes.push([marqueur]);
  }
  return groupes.map((membres,index)=>{ if(membres.length===1)return {type:"marqueur",marqueur:membres[0]}; const latitude=membres.reduce((n,m)=>n+m.latitude,0)/membres.length,longitude=membres.reduce((n,m)=>n+m.longitude,0)/membres.length; return {type:"cluster",id:`cluster-${index}-${membres[0].id}`,latitude,longitude,total:membres.length,membres}; });
}

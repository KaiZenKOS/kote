import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Favoris du client.
 *
 * Entierement locaux, jamais envoyes au serveur. C'est la reponse a la question
 * « faut-il un compte client ? » : tout ce qu'un compte apporterait ici --
 * retrouver une couturiere reperee la semaine derniere -- se fait sur le
 * telephone, sans identite, sans serveur, et sans reseau.
 *
 * Un mur d'inscription cote client aurait coute la majorite des utilisateurs au
 * premier ecran, pour un benefice que ce fichier de quarante lignes couvre.
 */

const CLE = "kote:favoris";

let memoire: string[] | null = null;
const abonnes = new Set<(ids: string[]) => void>();

async function charger(): Promise<string[]> {
  if (memoire) return memoire;
  try {
    const brut = await AsyncStorage.getItem(CLE);
    const analyse = brut ? JSON.parse(brut) : [];
    memoire = Array.isArray(analyse) ? analyse : [];
  } catch {
    memoire = [];
  }
  return memoire;
}

async function enregistrer(ids: string[]): Promise<void> {
  memoire = ids;
  abonnes.forEach((a) => a(ids));
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(ids));
  } catch {
    // Un favori perdu n'empeche personne de trouver sa boutique.
  }
}

export function useFavoris() {
  const [ids, setIds] = useState<string[]>(memoire ?? []);

  useEffect(() => {
    let vivant = true;
    void charger().then((liste) => {
      if (vivant) setIds(liste);
    });

    const ecoute = (liste: string[]) => setIds(liste);
    abonnes.add(ecoute);
    return () => {
      vivant = false;
      abonnes.delete(ecoute);
    };
  }, []);

  const basculer = useCallback(async (id: string) => {
    const liste = await charger();
    const suivante = liste.includes(id)
      ? liste.filter((x) => x !== id)
      : [id, ...liste].slice(0, 100);
    await enregistrer(suivante);
  }, []);

  return {
    ids,
    estFavori: useCallback((id: string) => ids.includes(id), [ids]),
    basculer,
  };
}

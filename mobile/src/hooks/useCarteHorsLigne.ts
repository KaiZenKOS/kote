import { useCallback, useEffect, useState } from "react";

import {
  paquetInstalle,
  poidsPaquet,
  supprimerPaquet,
  telechargerPaquet,
} from "../carte/horsLigne";

/**
 * Gestion du fond de carte hors ligne.
 *
 * Le telechargement n'est jamais lance seul : c'est l'utilisateur qui decide de
 * depenser plusieurs mega-octets de son forfait. En echange, la carte ne coute
 * plus rien ensuite -- ni en donnees, ni en facturation au chargement.
 */
export function useCarteHorsLigne() {
  const [installe, setInstalle] = useState(false);
  const [poids, setPoids] = useState(0);
  const [progression, setProgression] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      const present = await paquetInstalle();
      setInstalle(present);
      setPoids(present ? await poidsPaquet() : 0);
    } catch {
      setInstalle(false);
    }
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const telecharger = useCallback(async () => {
    setErreur(null);
    setProgression(0);
    try {
      await telechargerPaquet(
        (etat) => {
          setProgression(etat.termine ? null : etat.pourcentage);
          if (etat.termine) void rafraichir();
        },
        (message) => {
          setErreur(
            "Le téléchargement n'a pas abouti. Réessayez avec une meilleure connexion.",
          );
          console.error("carte hors ligne", message);
          setProgression(null);
        },
      );
    } catch {
      setErreur("Le téléchargement n'a pas pu démarrer.");
      setProgression(null);
    }
  }, [rafraichir]);

  const supprimer = useCallback(async () => {
    await supprimerPaquet();
    await rafraichir();
  }, [rafraichir]);

  return { installe, poids, progression, erreur, telecharger, supprimer };
}

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { lireFiche, listerPhotos } from "../api/marchands";
import { journaliser } from "../journal/file";
import { cles } from "../query/cles";
import type { FicheMarchand } from "../api/types";

/**
 * Fiche d'un commercant.
 *
 * C'est la donnee au cycle de vie le plus long du cache : trente jours. Le cas
 * d'usage qui le justifie n'est pas « ouvrir l'application hors ligne », mais
 * consulter la fiche EN MARCHANT vers la boutique -- le moment ou l'on perd le
 * signal entre deux quartiers, et precisement celui ou le point de repere est
 * indispensable.
 */
export function useFiche(id: string | null) {
  return useQuery<FicheMarchand>({
    queryKey: id ? cles.fiche(id) : ["fiche", "aucune"],
    queryFn: () => lireFiche(id!),
    enabled: id !== null,
  });
}

export function usePhotos(marchandId: string | null) {
  return useQuery({
    queryKey: marchandId ? cles.photos(marchandId) : ["photos", "aucune"],
    queryFn: () => listerPhotos(marchandId!),
    enabled: marchandId !== null,
  });
}

/**
 * Journalise une vue de fiche, une seule fois par ouverture d'ecran.
 *
 * Distinct de la mise en cache : une vue est un evenement d'interface, pas un
 * appel reseau. Elle doit etre comptee meme si la fiche vient du cache --
 * sinon le tableau de bord du marchand sous-estimerait son audience, et c'est
 * la seule preuve de valeur qu'on lui donne.
 */
export function useVueFiche(id: string | null) {
  const dejaCompte = useRef<string | null>(null);

  useEffect(() => {
    if (!id || dejaCompte.current === id) return;
    dejaCompte.current = id;
    void journaliser({ type: "vue_fiche", marchand_id: id });
  }, [id]);
}

/**
 * Precharge une fiche depuis la liste de resultats.
 *
 * Appele au moment ou une carte devient visible : quand l'utilisateur appuie,
 * la fiche est deja la. Utilise `ensureQueryData`, donc aucun appel si la
 * donnee est encore fraiche -- le prechargement ne doit jamais devenir une
 * source de consommation.
 */
export function usePrechargementFiche() {
  const client = useQueryClient();

  return (id: string) => {
    void client.ensureQueryData({
      queryKey: cles.fiche(id),
      queryFn: () => lireFiche(id),
    });
  };
}

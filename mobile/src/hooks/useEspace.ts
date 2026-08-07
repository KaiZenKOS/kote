import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmerActivite,
  certifierFiche,
  creerFiche,
  majFiche,
  mesCommissions,
  mesFiches,
  monAmbassadeur,
  publierFiche,
  retirerFiche,
  revendiquerFiche,
  revendiquerMesFiches,
  statistiques,
  suggererDescription,
  type SaisieFiche,
} from "../api/espace";
import { cles } from "../query/cles";
import { CLES_MUTATION } from "../query/mutations";
import { useSession } from "./useSession";
import { ajouterPhoto, mesPhotos, supprimerPhoto } from "../api/photos";
import type { PhotoMarchand } from "../api/types";
import { programmerRappelFiche } from "../notifications";

export function useMesPhotos(marchandId: string | null) {
  const { connecte } = useSession();
  return useQuery({ queryKey: ["espace", "photos", marchandId], queryFn: () => mesPhotos(marchandId!), enabled: connecte && marchandId !== null });
}

export function useAjouterPhoto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (args: { marchandId: string; photo: Parameters<typeof ajouterPhoto>[1] }) => ajouterPhoto(args.marchandId, args.photo),
    onSuccess: (_photo, args) => void client.invalidateQueries({ queryKey: ["espace", "photos", args.marchandId] }),
  });
}

export function useSupprimerPhoto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photo: PhotoMarchand) => supprimerPhoto(photo),
    onSuccess: (_r, photo) => void client.invalidateQueries({ queryKey: ["espace", "photos", photo.marchand_id] }),
  });
}

export function useMesFiches() {
  const { connecte } = useSession();
  return useQuery({
    queryKey: cles.mesFiches(),
    queryFn: mesFiches,
    enabled: connecte,
  });
}

export function useMonAmbassadeur() {
  const { connecte } = useSession();
  return useQuery({
    queryKey: cles.monAmbassadeur(),
    queryFn: monAmbassadeur,
    enabled: connecte,
  });
}

export function useMesCommissions() {
  const { connecte } = useSession();
  return useQuery({
    queryKey: cles.mesCommissions(),
    queryFn: mesCommissions,
    enabled: connecte,
  });
}

export function useStatistiques(marchandId: string | null, jours = 30) {
  const { connecte } = useSession();
  return useQuery({
    queryKey: marchandId
      ? cles.statistiques(marchandId, jours)
      : ["statistiques", "aucune"],
    queryFn: () => statistiques(marchandId!, jours),
    enabled: connecte && marchandId !== null,
  });
}

/**
 * Creation d'une fiche.
 *
 * `networkMode: "offlineFirst"` (le defaut de l'application) fait mettre la
 * mutation en file d'attente hors ligne ; la liste blanche de persistance la
 * fait survivre a la fermeture. C'est la combinaison qui rend la tournee d'un
 * ambassadeur possible dans un marche sans couverture.
 */
export function useCreerFiche() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: CLES_MUTATION.creationFiche,
    mutationFn: (saisie: SaisieFiche) => creerFiche(saisie),
    onSuccess: (fiche) => {
      void client.invalidateQueries({ queryKey: ["espace"] });
      // Le rappel reste local tant que le compte n’a pas explicitement activé
      // les notifications. En cas de refus, il n’empêche jamais la création.
      void programmerRappelFiche(fiche.nom_enseigne).catch(() => undefined);
    },
  });
}

export function useMajFiche() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      id: string;
      champs: Parameters<typeof majFiche>[1];
    }) => majFiche(args.id, args.champs),
    onSuccess: (_r, args) => {
      void client.invalidateQueries({ queryKey: ["espace"] });
      void client.invalidateQueries({ queryKey: cles.fiche(args.id) });
    },
  });
}

export function usePublierFiche() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publierFiche(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["espace"] }),
  });
}

export function useRetirerFiche() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retirerFiche(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["espace"] }),
  });
}

export function useRevendiquerFiche() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revendiquerFiche(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["espace"] }),
  });
}

export function useRevendiquerMesFiches() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: revendiquerMesFiches,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["espace"] }),
  });
}

export function useSuggestionDescription() {
  return useMutation({ mutationFn: (args: { marchandId: string; mots: string[] }) => suggererDescription(args.marchandId, args.mots) });
}

export function useCertifierFiche() {
  const client = useQueryClient();
  return useMutation({ mutationFn: certifierFiche, onSuccess: () => void client.invalidateQueries({ queryKey: ["espace"] }) });
}

/**
 * Confirmation d'activite.
 *
 * Persistee elle aussi : le marchand appuie sur « je suis toujours là » depuis
 * son etal, souvent sans reseau. Perdre ce geste ferait basculer sa fiche en
 * veille alors qu'il vient justement de la confirmer.
 */
export function useConfirmerActivite() {
  const client = useQueryClient();
  const { utilisateurId } = useSession();

  return useMutation({
    mutationKey: CLES_MUTATION.confirmation,
    mutationFn: (args: {
      marchandId: string;
      source: "marchand" | "ambassadeur";
    }) => {
      if (!utilisateurId) throw new Error("Session requise");
      return confirmerActivite(args.marchandId, utilisateurId, args.source);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ["espace"] }),
  });
}

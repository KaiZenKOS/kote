import { Linking } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { demanderContact, signaler } from "../api/actions";
import { journaliser } from "../journal/file";
import { cles } from "../query/cles";
import { CLES_MUTATION } from "../query/mutations";
import type { MotifSignalement, Position } from "../api/types";

/**
 * Mise en relation WhatsApp.
 *
 * `networkMode: "online"` est un choix explicite, a contre-courant du reste de
 * l'application : cette action ne doit PAS etre mise en file d'attente. Ouvrir
 * WhatsApp deux heures plus tard, quand le reseau revient, n'aurait aucun sens
 * pour l'utilisateur -- et enregistrerait un contact client qui n'a pas eu
 * lieu, faussant l'indicateur central du produit et la commission de
 * l'ambassadeur. Hors ligne, on echoue tout de suite et on le dit.
 */
export function useContactWhatsApp() {
  return useMutation({
    mutationKey: CLES_MUTATION.contact,
    networkMode: "online",
    mutationFn: async (args: {
      marchandId: string;
      position?: Position | null;
    }) => {
      const reponse = await demanderContact(args.marchandId, args.position);
      const ouvrable = await Linking.canOpenURL(reponse.lien);
      if (!ouvrable) throw new Error("WhatsApp n'est pas installe");
      await Linking.openURL(reponse.lien);
      return reponse;
    },
  });
}

/**
 * Signalement d'une fiche fausse ou fermee.
 *
 * Comportement inverse du contact : la mutation est mise en file d'attente hors
 * ligne et persistee sur le disque. Le client est souvent devant une boutique
 * fermee, donc loin d'une bonne connexion -- c'est exactement la qu'il faut
 * capter l'information, quitte a l'envoyer plus tard.
 */
export function useSignalement() {
  const client = useQueryClient();

  return useMutation({
    mutationKey: CLES_MUTATION.signalement,
    mutationFn: (args: {
      marchandId: string;
      motif: MotifSignalement;
      commentaire?: string;
    }) => signaler(args.marchandId, args.motif, args.commentaire),
    onSuccess: (_donnees, args) => {
      // Le statut de la fiche peut changer cote serveur des que les
      // signalements convergent : on invalide pour ne pas afficher une fiche
      // qu'on vient soi-meme de declarer fermee.
      void client.invalidateQueries({ queryKey: cles.fiche(args.marchandId) });
    },
  });
}

/** Itineraire : journalise puis delegue a l'application de cartes du telephone. */
export function useItineraire() {
  return async (marchandId: string, latitude: number, longitude: number) => {
    void journaliser({ type: "clic_itineraire", marchand_id: marchandId });
    const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    const secours = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    await Linking.openURL((await Linking.canOpenURL(url)) ? url : secours);
  };
}

/**
 * Correspondance entre les identifiants d'icone du referentiel et les icones
 * Lucide. Le backend ne stocke qu'un identifiant symbolique -- jamais un emoji,
 * jamais un caractere decoratif.
 */

import {
  Bike,
  Scissors,
  Shirt,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";

const PAR_IDENTIFIANT: Record<string, LucideIcon> = {
  couture: Shirt,
  alimentation: UtensilsCrossed,
  beaute: Scissors,
  mecanique: Bike,
  reparation: Wrench,
  commerce: Store,
};

export function iconeCategorie(identifiant: string): LucideIcon {
  return PAR_IDENTIFIANT[identifiant] ?? Store;
}

-- ---------------------------------------------------------------------------
-- Types metier.
-- ---------------------------------------------------------------------------

-- Cycle de vie d'une fiche. La progression active -> a_confirmer -> en_veille
-- est la boucle de fraicheur decrite en section 6 du CDC : c'est le mecanisme
-- qui empeche la base de pourrir, identifie comme risque critique du projet.
create type public.statut_marchand as enum (
  'brouillon',    -- saisie ambassadeur non encore validee
  'active',       -- visible dans les resultats
  'a_confirmer',  -- au-dela de 90 jours sans confirmation, toujours visible mais signalee
  'en_veille',    -- au-dela de 180 jours, retiree des resultats par defaut
  'suspendue',    -- decision de moderation
  'retiree'       -- droit de retrait exerce par le marchand (CDC 9.2)
);

-- Origine d'une preuve de vie d'une fiche.
create type public.source_confirmation as enum (
  'marchand',     -- connexion ou action du marchand lui-meme
  'relance',      -- reponse en un clic a la relance automatique
  'ambassadeur',  -- passage physique d'un ambassadeur
  'admin'
);

create type public.motif_signalement as enum (
  'ferme',
  'demenage',
  'infos_fausses',
  'abus'
);

-- Journal d'usage. Alimente le tableau de bord marchand (CDC 5.1) et la
-- detection de fraude a l'inscription (CDC 9.3).
create type public.type_evenement as enum (
  'recherche',
  'vue_fiche',
  'clic_whatsapp',
  'clic_itineraire'
);

create type public.statut_commission as enum (
  'en_attente',
  'validee',
  'payee',
  'annulee'
);

-- Une commission se paie en deux temps pour ne jamais remunerer une inscription
-- brute, qui est l'incitation directe a la fiche fictive (CDC 7.3).
create type public.part_commission as enum (
  'validation',  -- fiche validee : photo geolocalisee + numero joignable
  'j30'          -- a J+30 : fiche toujours active et au moins un contact client reel
);

// ---------------------------------------------------------------------------
// Verification de bout en bout de l'exposition de l'API.
//
// Les tests pgTAP verifient les privileges dans la base. Ce script verifie ce
// qui sort reellement par le reseau, avec la cle anonyme, c'est-a-dire ce
// qu'un tiers peut obtenir sans compte.
//
// Usage :
//   node scripts/verifier-api.mjs
//   (URL_API et CLE_ANON lues dans l'environnement, valeurs locales par defaut)
// ---------------------------------------------------------------------------

const URL_API = process.env.URL_API ?? "http://127.0.0.1:54321";
const CLE_ANON = process.env.CLE_ANON;

if (!CLE_ANON) {
  console.error(
    "CLE_ANON manquante. Recuperez-la avec : npx supabase status\n" +
      "Puis : $env:CLE_ANON = \"<anon key>\"",
  );
  process.exit(2);
}

const enteteBase = {
  apikey: CLE_ANON,
  Authorization: `Bearer ${CLE_ANON}`,
  "Content-Type": "application/json",
};

let echecs = 0;

function verifier(condition, libelle, detail) {
  if (condition) {
    console.log(`  ok    ${libelle}`);
  } else {
    echecs += 1;
    console.log(`  ECHEC ${libelle}`);
    if (detail !== undefined) console.log(`        ${JSON.stringify(detail)}`);
  }
}

async function principal() {
  console.log("Verification de l'exposition publique de l'API\n");

  // 1. La table qui porte les numeros ne doit pas etre lisible anonymement.
  const brut = await fetch(`${URL_API}/rest/v1/marchand?select=*`, { headers: enteteBase });
  verifier(
    brut.status === 401 || brut.status === 403 || brut.status === 404,
    "La table marchand n'est pas lisible avec la cle anonyme",
    { statut: brut.status },
  );

  // 2. La vue publique, elle, doit repondre.
  const vue = await fetch(
    `${URL_API}/rest/v1/marchand_public?select=id,nom_enseigne,latitude,longitude&limit=5`,
    { headers: enteteBase },
  );
  const fiches = vue.ok ? await vue.json() : [];
  verifier(vue.ok, "La vue publique repond avec la cle anonyme", { statut: vue.status });

  // 3. Aucune fiche publique ne doit contenir de numero, sous quelque nom que ce soit.
  const serialise = JSON.stringify(fiches);
  verifier(
    !/\+?228\d{8}/.test(serialise) && !/telephone/i.test(serialise),
    "Aucun numero de telephone dans la reponse publique",
  );

  // 4. La recherche de proximite est ouverte.
  const recherche = await fetch(`${URL_API}/rest/v1/rpc/rechercher_marchands`, {
    method: "POST",
    headers: enteteBase,
    body: JSON.stringify({ p_lat: 6.178, p_lng: 1.236, p_rayon_m: 3000 }),
  });
  const resultats = recherche.ok ? await recherche.json() : [];
  verifier(recherche.ok, "La recherche de proximite repond", { statut: recherche.status });
  verifier(
    Array.isArray(resultats) && resultats.length > 0,
    "La recherche renvoie au moins un resultat sur le jeu de donnees local",
    { nombre: Array.isArray(resultats) ? resultats.length : null },
  );
  verifier(
    !/telephone/i.test(JSON.stringify(resultats)),
    "Les resultats de recherche ne contiennent aucun numero",
  );

  // 5. Les distances sont croissantes : le tri de proximite fonctionne.
  if (Array.isArray(resultats) && resultats.length > 1) {
    const distances = resultats.map((r) => r.distance_m);
    const actifs = resultats.filter((r) => r.statut === "active").map((r) => r.distance_m);
    verifier(
      actifs.every((d, i) => i === 0 || actifs[i - 1] <= d),
      "Les fiches actives sont triees par distance croissante",
      { distances },
    );
  }

  // 6. Le journal d'usage ne doit pas etre alimentable directement.
  const journal = await fetch(`${URL_API}/rest/v1/evenement_usage`, {
    method: "POST",
    headers: enteteBase,
    body: JSON.stringify({ type: "clic_whatsapp" }),
  });
  verifier(
    !journal.ok,
    "Le journal d'usage n'est pas alimentable avec la cle anonyme",
    { statut: journal.status },
  );

  // 7. Les parametres d'exploitation restent prives.
  const parametres = await fetch(`${URL_API}/rest/v1/parametre?select=*`, { headers: enteteBase });
  verifier(!parametres.ok, "Les parametres d'exploitation ne sont pas exposes", {
    statut: parametres.status,
  });

  console.log(
    echecs === 0
      ? "\nToutes les verifications passent."
      : `\n${echecs} verification(s) en echec.`,
  );
  process.exit(echecs === 0 ? 0 : 1);
}

principal().catch((e) => {
  console.error("Erreur d'execution :", e.message);
  process.exit(2);
});

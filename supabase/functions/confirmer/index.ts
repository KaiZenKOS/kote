// ---------------------------------------------------------------------------
// Confirmation en un clic, depuis la relance WhatsApp.
//
// La cible marchande ne saisira pas d'identifiants et ne suivra pas un parcours
// a plusieurs ecrans (CDC 2.4). La relance doit se resoudre par un seul appui
// sur un lien, sur un telephone d'entree de gamme, parfois en 3G degradee.
//
// D'ou une page HTML autonome de quelques centaines d'octets : aucune police
// distante, aucun script, aucune image.
// ---------------------------------------------------------------------------

import { clientService } from "../_partage/client.ts";
import { ENTETES_CORS, prevol } from "../_partage/http.ts";

function page(titre: string, message: string, statut: number): Response {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre}</title>
<style>
body{margin:0;padding:2rem 1.25rem;font:16px/1.5 system-ui,sans-serif;color:#14231d;background:#fff}
main{max-width:32rem;margin:0 auto}
h1{font-size:1.35rem;margin:0 0 .75rem}
p{margin:0;color:#3d4f47}
</style></head>
<body><main><h1>${titre}</h1><p>${message}</p></main></body></html>`;

  return new Response(html, {
    status: statut,
    headers: { ...ENTETES_CORS, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (requete) => {
  const reponsePrevol = prevol(requete);
  if (reponsePrevol) return reponsePrevol;

  const jeton = new URL(requete.url).searchParams.get("j");

  if (!jeton || !/^[0-9a-f]{48}$/.test(jeton)) {
    return page("Lien invalide", "Ce lien de confirmation n'est pas reconnu.", 400);
  }

  const client = clientService();

  // Consommation atomique : le jeton est a usage unique. La condition
  // `utilise_le is null` fait office de verrou.
  const { data: consomme, error } = await client
    .from("jeton_confirmation")
    .update({ utilise_le: new Date().toISOString() })
    .eq("jeton", jeton)
    .is("utilise_le", null)
    .gt("expire_le", new Date().toISOString())
    .select("marchand_id")
    .maybeSingle();

  if (error) {
    console.error("consommation jeton", error.message);
    return page("Service indisponible", "Reessayez dans quelques instants.", 503);
  }

  if (!consomme) {
    return page(
      "Deja confirme",
      "Cette confirmation a deja ete enregistree, ou le lien a expire.",
      200,
    );
  }

  const { error: erreurConfirmation } = await client.from("confirmation").insert({
    marchand_id: consomme.marchand_id,
    source: "relance",
  });

  if (erreurConfirmation) {
    console.error("insertion confirmation", erreurConfirmation.message);
    return page("Service indisponible", "Reessayez dans quelques instants.", 503);
  }

  return page(
    "C'est confirme",
    "Votre boutique reste visible pour les clients autour de vous. Merci.",
    200,
  );
});

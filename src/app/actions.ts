"use server";

import { revalidatePath } from "next/cache";

/**
 * Invalide le cache SSR de la page boutique d'un vendeur.
 * À appeler depuis le dashboard après chaque modification (thème, blocs, profil).
 */
export async function revalidateStore(slug: string) {
  // revalidatePath uses the internal file-system route, not the public URL
  // Files are at src/app/store/[slug]/ — middleware rewrites /{slug} → /store/{slug}
  revalidatePath(`/store/${slug}`, "page");
}

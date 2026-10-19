import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, LOCALE_COOKIE } from "./config";
import { detectLocale } from "./detect";
import { loadMessages } from "./messages";

/**
 * La langue de la requete : le cookie, sinon la detection.
 *
 * Le middleware pose le cookie des la premiere visite, mais cette premiere
 * requete-la ne l'a pas encore : on refait donc la meme detection, avec la
 * meme fonction, pour que la premiere page soit deja dans la bonne langue.
 */
export async function getRequestLocale() {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return detectLocale(await headers());
}

export default getRequestConfig(async () => {
  const locale = await getRequestLocale();
  return {
    locale,
    messages: await loadMessages(locale),
  };
});

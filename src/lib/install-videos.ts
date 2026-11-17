/*
 * Les videos de presentation et du tuto d'installation, rendues par le
 * projet Remotion de video/ et servies depuis public/videos (exclues du
 * precache du service worker : cf. next.config.mjs).
 */
type VideoLocale = "fr" | "en";

const videoLocale = (locale: string): VideoLocale => (locale === "en" ? "en" : "fr");

export const presentationVideo = (locale: string) => {
  const l = videoLocale(locale);
  return { src: `/videos/presentation-${l}.mp4`, poster: `/videos/presentation-${l}.jpg` };
};

export const installVideo = (locale: string) => {
  const l = videoLocale(locale);
  return { src: `/videos/install-iphone-${l}.mp4`, poster: `/videos/install-iphone-${l}.jpg` };
};

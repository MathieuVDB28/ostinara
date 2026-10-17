import { EARLY_BIRD, isEarlyBird, offeredPlan } from "@/lib/waitlist";
import { PLANS } from "@/lib/stripe/config";
import type { UserPlan } from "@/types";

interface WaitlistEmailInput {
  plan: UserPlan;
  rank: number;
  unsubscribeUrl: string;
  appUrl: string;
}

/*
 * Les couleurs claires de globals.css, en dur : les clients mail ne lisent
 * ni variables CSS ni polices web. Barlow Condensed est tente, avec
 * Arial Narrow en repli pour garder l'allure condensee des titres.
 */
const INK = "#1c1a17";
const PAPER = "#f6f4f1";
const MUTED = "#5e5850";
const BORDER = "#e4dfd6";
const AMBER = "#8a5214";
const DISPLAY = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** L'email de confirmation d'inscription a la liste d'attente. */
export function waitlistConfirmationEmail({ plan, rank, unsubscribeUrl, appUrl }: WaitlistEmailInput) {
  const early = isEarlyBird(rank);
  const planName = PLANS[plan].name;
  const offeredName = PLANS[offeredPlan(plan)].name;
  const appHost = new URL(appUrl).host;
  const subject = early
    ? `T'es n°${rank} sur la liste — ${EARLY_BIRD.months} mois de ${offeredName} offerts`
    : `T'es n°${rank} sur la liste d'Ostinara`;

  const offerText = early
    ? `Tu fais partie des ${EARLY_BIRD.spots} premiers : ${EARLY_BIRD.months} mois de ${offeredName} t'attendent à l'ouverture de ton accès.`
    : null;

  const text = [
    `C'est noté. Tu es n°${rank} sur la liste d'attente d'Ostinara.`,
    "",
    `Plan qui t'intéresse : ${planName}.`,
    offerText,
    "",
    "On ouvre l'accès par vagues, dans l'ordre des inscriptions. Tu recevras ton lien d'accès par email quand ce sera ton tour.",
    "",
    "D'ici là, fais tourner à ton groupe :",
    `${appUrl}/acces-anticipe`,
    "",
    "— Ostinara",
    "",
    `Se désinscrire : ${unsubscribeUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK};font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;border-bottom:1px solid ${BORDER};font-family:${DISPLAY};font-size:22px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;">Ostinara</td></tr>
        <tr><td style="padding-top:28px;font-family:monospace;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">Accès anticipé · Plan ${planName}</td></tr>
        <tr><td style="padding-top:10px;font-family:${DISPLAY};font-size:56px;font-weight:800;line-height:0.9;text-transform:uppercase;">C'est noté.</td></tr>
        <tr><td style="padding-top:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};">
            <tr>
              <td style="padding:16px 0;font-family:monospace;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">Ta place</td>
              <td align="right" style="padding:16px 0;font-family:${DISPLAY};font-size:64px;font-weight:800;line-height:0.85;">n°${rank}</td>
            </tr>
          </table>
        </td></tr>
        ${
          offerText
            ? `<tr><td style="padding-top:20px;font-size:16px;line-height:1.55;"><strong style="color:${AMBER};">Offre de lancement.</strong> ${offerText}</td></tr>`
            : ""
        }
        <tr><td style="padding-top:16px;font-family:Georgia,serif;font-style:italic;font-size:17px;line-height:1.6;color:#3d382f;">
          On ouvre l'accès par vagues, dans l'ordre des inscriptions. Tu recevras ton lien d'accès par email quand ce sera ton tour.
        </td></tr>
        <tr><td style="padding-top:28px;">
          <a href="${appUrl}/acces-anticipe" style="display:inline-block;padding:14px 22px;border-radius:12px;background:${AMBER};color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Faire tourner à mon groupe →</a>
        </td></tr>
        <tr><td style="padding-top:40px;border-bottom:1px solid ${BORDER};"></td></tr>
        <tr><td style="padding-top:16px;font-size:12px;line-height:1.6;color:${MUTED};">
          Tu reçois cet email parce que tu t'es inscrit·e sur ${appHost}. On ne t'écrira qu'au sujet de ton accès.
          <a href="${unsubscribeUrl}" style="color:${MUTED};">Se désinscrire</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

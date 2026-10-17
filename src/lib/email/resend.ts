/**
 * Envoi d'emails transactionnels via l'API HTTP de Resend.
 *
 * Un simple fetch plutot que le SDK : un seul appel, aucune dependance.
 * Sans RESEND_API_KEY ni EMAIL_FROM, l'envoi est saute et journalise : une
 * inscription ne doit jamais echouer faute d'email. EMAIL_FROM n'a pas de
 * valeur par defaut : Resend n'envoie que depuis un domaine verifie, et
 * *.vercel.app ne peut pas l'etre.
 */

/** L'envoi est-il configure ? Sert aussi a ne pas annoncer un email qui ne partira pas. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[Email] RESEND_API_KEY ou EMAIL_FROM absent : email non envoye a", input.to);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: input.headers,
      }),
    });

    if (!response.ok) {
      console.error("[Email] Resend a refuse l'envoi :", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Email] Erreur d'envoi :", error);
    return false;
  }
}

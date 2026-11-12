/**
 * Envoi des mails de confirmation (première connexion d'un habitant).
 *
 * Activé seulement si SMTP_HOST est renseigné. Sans SMTP (démo locale, développement), un habitant inscrit
 * choisit directement son mot de passe à la première connexion, comme avant.
 * Variables : SMTP_HOST, SMTP_PORT (défaut 465), SMTP_USER, SMTP_PASSWORD, MAIL_FROM (défaut SMTP_USER),
 * SITE_URL (adresse publique du site, utilisée dans le lien : OBLIGATOIRE avec SMTP_HOST).
 */
import nodemailer from "nodemailer";

export const mailEnabled = () => Boolean(process.env.SMTP_HOST);

let transport;
function transporter() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transport;
}

export async function sendConfirmation(to, link) {
  await transporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "BlockLucky : confirmez votre compte",
    text: [
      "Bonjour,",
      "",
      "Votre mairie vous a inscrit à la loterie BlockLucky. Pour activer votre compte et choisir votre mot de passe,",
      "ouvrez ce lien (valable 24 heures) :",
      "",
      link,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce mail : rien ne sera créé.",
    ].join("\n"),
  });
}

export async function sendPasswordReset(to, link) {
  await transporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "BlockLucky : nouveau mot de passe",
    text: [
      "Bonjour,",
      "",
      "Vous avez demandé à changer le mot de passe de votre compte BlockLucky. Ouvrez ce lien (valable 1 heure) :",
      "",
      link,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce mail : votre mot de passe ne change pas.",
    ].join("\n"),
  });
}

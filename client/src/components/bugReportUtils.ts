/**
 * Logique pure du formulaire "Signaler un problème" — sans dépendance React/navigateur,
 * donc testable unitairement. Doit rester alignée avec la validation serveur
 * (router.ts: message z.string().trim().min(5), userEmail z.string().email().optional()).
 */
export const MIN_MESSAGE = 5;

export const isValidEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export interface BugReportValidation {
  trimmed: string;
  emailFilled: boolean;
  emailOk: boolean;
  messageOk: boolean;
  messageTooShort: boolean;
  canSend: boolean;
}

export function validateBugReport(text: string, email: string): BugReportValidation {
  const trimmed = text.trim();
  const emailFilled = email.trim() !== '';
  const emailOk = !emailFilled || isValidEmail(email);
  const messageOk = trimmed.length >= MIN_MESSAGE;
  return {
    trimmed,
    emailFilled,
    emailOk,
    messageOk,
    messageTooShort: trimmed.length > 0 && trimmed.length < MIN_MESSAGE,
    canSend: messageOk && emailOk,
  };
}

/**
 * Convertit n'importe quelle erreur en message FR clair.
 * GARANTIE : ne renvoie jamais une erreur brute (JSON Zod, objet sérialisé, etc.).
 */
export function friendlyError(err: unknown): string {
  const e = err as { data?: { code?: string }; message?: string } | undefined;
  const code = e?.data?.code;
  if (code === 'TOO_MANY_REQUESTS') return "Trop d'envois en peu de temps. Réessayez dans une minute.";
  if (code === 'BAD_REQUEST' || code === 'PARSE_ERROR')
    return `Vérifiez votre message (au moins ${MIN_MESSAGE} caractères) et, si renseigné, l'email.`;
  const msg = typeof e?.message === 'string' ? e.message.trim() : '';
  if (msg && !msg.startsWith('[') && !msg.startsWith('{')) return msg;
  return "Envoi impossible pour le moment. Réessayez dans un instant.";
}

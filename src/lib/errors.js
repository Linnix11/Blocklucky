/**
 * Traduit les erreurs techniques (portefeuille, réseau, contrat) en messages clairs, en français.
 */
import { Interface } from "ethers";
import { LOTTERY_ABI } from "../config";
import { formatEth } from "./format";

const lotteryInterface = new Interface(LOTTERY_ABI);

const CONTRACT_ERRORS = {
  LotteryNotOpen: () => "La vente de tickets n'est pas ouverte en ce moment.",
  LotteryNotClosed: () => "Une loterie est déjà en cours : attendez la fin de son tirage.",
  LotteryEnded: () => "La vente est terminée : la date limite est passée ou le nombre de participants est atteint.",
  InvalidQuantity: () => "Choisissez au moins un ticket.",
  IncorrectPayment: (args) => `Le montant envoyé ne correspond pas au prix (${formatEth(args[0])} attendus).`,
  TicketLimitReached: (args) => `Vous avez atteint la limite de ${args[0]} tickets par portefeuille.`,
  DrawConditionsNotMet: () => "Le tirage n'est possible qu'à la fin de la loterie.",
  InvalidParameters: () => "Tous les paramètres de la loterie doivent être supérieurs à zéro.",
  NothingToWithdraw: () => "Vous n'avez aucun gain à récupérer.",
  TransferFailed: () => "L'envoi des gains a échoué. Votre portefeuille accepte-t-il les ETH ?",
  NoPendingDraw: () => "Aucun tirage n'est en attente.",
  RetryTooEarly: () => "Il est encore trop tôt pour relancer le tirage : Chainlink a jusqu'à 1 h pour répondre.",
  OwnableUnauthorizedAccount: () => "Seule la mairie peut ouvrir une loterie.",
};

/** Cherche les données d'erreur du contrat, où qu'elles soient rangées selon le portefeuille. */
function findRevertData(error) {
  const candidates = [error?.data, error?.info?.error?.data, error?.error?.data, error?.info?.error?.data?.data];
  return candidates.find((d) => typeof d === "string" && d.startsWith("0x") && d.length >= 10);
}

function decodeContractError(error) {
  if (error?.revert?.name) return error.revert;
  const data = findRevertData(error);
  if (!data) return null;
  try {
    return lotteryInterface.parseError(data);
  } catch {
    return null;
  }
}

export function humanizeError(error) {
  const code = error?.code ?? error?.info?.error?.code;

  if (code === "ACTION_REJECTED" || code === 4001) {
    return "Vous avez refusé la demande dans votre portefeuille. Rien n'a été envoyé.";
  }
  if (code === -32002) {
    return "Une demande attend déjà votre réponse dans votre portefeuille : ouvrez l'extension.";
  }
  if (code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(error?.message ?? "")) {
    return "Solde insuffisant pour payer les tickets et les frais de réseau.";
  }

  const decoded = decodeContractError(error);
  if (decoded && CONTRACT_ERRORS[decoded.name]) {
    return CONTRACT_ERRORS[decoded.name](decoded.args ?? []);
  }
  if (code === "NETWORK_ERROR" || code === "SERVER_ERROR" || code === "TIMEOUT") {
    return "Le réseau ne répond pas. Vérifiez votre connexion puis réessayez.";
  }
  // « could not coalesce error » : ethers n'a pas reconnu l'erreur du portefeuille ; son vrai message est rangé plus loin.
  const walletMessage = error?.info?.error?.message || error?.error?.message;
  if (error?.shortMessage === "could not coalesce error" && walletMessage) return `Portefeuille : ${walletMessage}`;
  return error?.shortMessage || error?.message || "Une erreur inattendue est survenue.";
}

/** Vrai si l'erreur vient d'un refus de l'utilisateur (pas besoin de l'alarmer). */
export function isUserRejection(error) {
  const code = error?.code ?? error?.info?.error?.code;
  return code === "ACTION_REJECTED" || code === 4001;
}

/**
 * Ouvre une loterie avec les valeurs de la démo : 0,001 ETH le ticket, 5 participants ou 10 minutes,
 * 5 tickets maximum par portefeuille.
 *
 *   npx hardhat run scripts/startRound.js --network localhost
 *   npx hardhat run scripts/startRound.js --network sepolia
 *
 * L'adresse de la loterie est lue dans frontend/src/contracts/addresses.json (écrit par deploy.js).
 */
const { ethers, network } = require("hardhat");
const { networkConfig, demoRound } = require("./lib/networkConfig");
const { getDeployedAddress } = require("./lib/frontendExport");

const STATES = ["CLOSED (fermée)", "OPEN (ouverte)", "CALCULATING (tirage en cours)"];

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const config = networkConfig[Number(chainId)];
  const { BlockLucky: address } = getDeployedAddress(chainId);

  const [mairie] = await ethers.getSigners();
  const lottery = await ethers.getContractAt("BlockLucky", address, mairie);

  // Vérifications avant d'envoyer la transaction (messages clairs plutôt qu'un rejet obscur)
  const owner = await lottery.owner();
  if (owner.toLowerCase() !== mairie.address.toLowerCase()) {
    throw new Error(`Le compte ${mairie.address} n'est pas la mairie (owner = ${owner}).`);
  }
  const state = Number(await lottery.state());
  if (state !== 0) {
    throw new Error(
      `Impossible d'ouvrir une loterie : la n°${await lottery.roundId()} est ${STATES[state]}. ` +
        "Attendez la fin du tirage (ou lancez requestDraw si la loterie est terminée)."
    );
  }

  const price = ethers.parseEther(demoRound.ticketPriceEth);
  console.log(`\n🎄 Ouverture d'une loterie BlockLucky sur ${network.name} (${address})`);
  const tx = await lottery.startNewRound(
    price,
    demoRound.maxParticipants,
    demoRound.maxTicketsPerWallet,
    demoRound.durationSeconds
  );
  console.log(`   Transaction : ${config.explorer ? `${config.explorer}/tx/${tx.hash}` : tx.hash}`);
  await tx.wait(config.local ? 1 : 2);

  const endTime = new Date(Number(await lottery.endTime()) * 1000);
  console.log(`\n✅ Loterie n°${await lottery.roundId()} ouverte`);
  console.log(`   Prix du ticket      : ${demoRound.ticketPriceEth} ETH`);
  console.log(`   Fin                 : ${demoRound.maxParticipants} participants ou ${endTime.toLocaleString("fr-FR")}`);
  console.log(`   Tickets max / pers. : ${demoRound.maxTicketsPerWallet}`);
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  process.exitCode = 1;
});

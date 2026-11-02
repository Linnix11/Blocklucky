/**
 * Simulation complète d'une loterie BlockLucky en local.
 *
 *   npx hardhat node                                       (terminal 1)
 *   npx hardhat run scripts/simulate.js --network localhost (terminal 2)
 *
 * ou directement, sur le réseau Hardhat éphémère :
 *   npx hardhat run scripts/simulate.js
 *
 * Étapes : déploiement du faux coordinateur Chainlink (mock) et de la loterie, ouverture
 * d'une loterie (valeurs de la démo), achat de tickets par 5 habitants, tirage, gagnant.
 */
const { ethers, network } = require("hardhat");

const PRICE = ethers.parseEther("0.001");
const MAX_PARTICIPANTS = 5n;
const MAX_TICKETS = 5n;
const DURATION = 10n * 60n;
const KEY_HASH = ethers.id("blocklucky-local-keyhash");
const STATES = ["CLOSED (fermée)", "OPEN (ouverte)", "CALCULATING (tirage en cours)"];

const short = (addr) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
const eth = (wei) => `${ethers.formatEther(wei)} ETH`;

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  if (chainId !== 31337n) {
    throw new Error(`simulate.js est réservé au réseau local (chainId 31337), pas à ${chainId}.`);
  }

  const [mairie, ...habitants] = await ethers.getSigners();
  const joueurs = habitants.slice(0, 5);
  const noms = ["Alice", "Bruno", "Chloé", "Djamel", "Emma"];
  const achats = [2n, 1n, 3n, 1n, 5n]; // tickets achetés par chacun

  console.log("\n🎄 BlockLucky : simulation d'une loterie des fêtes à EtherBay");
  console.log(`   Réseau : ${network.name} (chainId ${chainId})\n`);

  // 1. Faux coordinateur Chainlink VRF + souscription
  const Mock = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
  const vrf = await Mock.deploy(ethers.parseEther("0.1"), 1_000_000_000n, 4_000_000_000_000_000n);
  await vrf.waitForDeployment();
  const receipt = await (await vrf.createSubscription()).wait();
  const subId = receipt.logs
    .map((log) => vrf.interface.parseLog(log))
    .find((event) => event && event.name === "SubscriptionCreated").args.subId;
  await (await vrf.fundSubscription(subId, ethers.parseEther("100"))).wait();
  console.log(`1. Mock Chainlink VRF déployé : ${await vrf.getAddress()}`);

  // 2. Loterie
  const BlockLucky = await ethers.getContractFactory("BlockLucky");
  const lottery = await BlockLucky.deploy(await vrf.getAddress(), subId, KEY_HASH);
  await lottery.waitForDeployment();
  await (await vrf.addConsumer(subId, await lottery.getAddress())).wait();
  console.log(`2. BlockLucky déployé      : ${await lottery.getAddress()} (mairie : ${short(mairie.address)})`);

  // 3. Ouverture
  await (await lottery.startNewRound(PRICE, MAX_PARTICIPANTS, MAX_TICKETS, DURATION)).wait();
  console.log(
    `3. Loterie n°${await lottery.roundId()} ouverte : ticket à ${eth(PRICE)}, ` +
      `${MAX_PARTICIPANTS} participants ou ${DURATION / 60n} minutes, ${MAX_TICKETS} tickets max par portefeuille\n`
  );

  // 4. Achats
  console.log("4. Achat des tickets");
  for (let i = 0; i < joueurs.length; i++) {
    await (await lottery.connect(joueurs[i]).enterLottery(achats[i], { value: PRICE * achats[i] })).wait();
    console.log(
      `   ${noms[i].padEnd(7)} (${short(joueurs[i].address)}) achète ${achats[i]} ticket(s) → cagnotte ${eth(
        await lottery.getPot()
      )}`
    );
  }
  const totalTickets = (await lottery.getTickets()).length;
  console.log(`   Participants : ${await lottery.participantsCount()} / ${MAX_PARTICIPANTS}, tickets : ${totalTickets}`);
  console.log(`   Tirage possible : ${(await lottery.canDraw()) ? "oui" : "non"}\n`);

  // 5. Tirage demandé par un habitant (pas la mairie)
  await (await lottery.connect(joueurs[1]).requestDraw()).wait();
  const requestId = await lottery.lastRequestId();
  console.log(`5. ${noms[1]} lance le tirage → demande Chainlink n°${requestId}, état : ${STATES[Number(await lottery.state())]}`);

  // 6. Réponse du (faux) Chainlink
  const roundId = await lottery.roundId();
  const soldesAvant = await Promise.all(joueurs.map((j) => ethers.provider.getBalance(j.address)));
  await (await vrf.fulfillRandomWords(requestId, await lottery.getAddress())).wait();

  const result = await lottery.results(roundId);
  const idx = joueurs.findIndex((j) => j.address === result.winner);
  const gain = (await ethers.provider.getBalance(result.winner)) - soldesAvant[idx];

  console.log(`6. Chainlink répond, état : ${STATES[Number(await lottery.state())]}\n`);
  console.log("🎉 ==============================================");
  console.log(`   GAGNANT : ${noms[idx]} (${result.winner})`);
  console.log(`   Chances : ${achats[idx]} ticket(s) sur ${result.ticketsSold} (${((Number(achats[idx]) * 100) / Number(result.ticketsSold)).toFixed(1)} %)`);
  console.log(`   Gain    : ${eth(result.prize)} (100 % de la cagnotte), reçu : ${eth(gain)}`);
  console.log("   ==============================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

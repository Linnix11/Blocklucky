/**
 * EN LOCAL UNIQUEMENT : joue le rôle de Chainlink en faisant répondre le mock VRF au tirage en cours.
 * Sur Sepolia, c'est le vrai réseau Chainlink qui répond tout seul, en quelques minutes.
 *
 *   npx hardhat run scripts/fulfillLocal.js --network localhost
 *
 * À lancer après qu'un participant a cliqué sur « Lancer le tirage » (requestDraw) dans l'interface.
 */
const { ethers } = require("hardhat");
const { getDeployedAddress } = require("./lib/frontendExport");

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const { BlockLucky: address, VRFCoordinator, vrfMock } = getDeployedAddress(chainId);
  if (chainId !== 31337n || !vrfMock) {
    throw new Error("fulfillLocal.js ne sert qu'en local, avec le mock Chainlink.");
  }

  const lottery = await ethers.getContractAt("BlockLucky", address);
  if (Number(await lottery.state()) !== 2) {
    throw new Error("Aucun tirage en attente (la loterie n'est pas en CALCULATING).");
  }

  const vrf = await ethers.getContractAt("VRFCoordinatorV2_5Mock", VRFCoordinator);
  const roundId = await lottery.roundId();
  await (await vrf.fulfillRandomWords(await lottery.lastRequestId(), address)).wait();

  const result = await lottery.results(roundId);
  console.log(`\n🎉 Loterie n°${roundId} : gagnant ${result.winner}, ${ethers.formatEther(result.prize)} ETH`);
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  process.exitCode = 1;
});

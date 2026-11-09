/**
 * Déploiement de BlockLucky.
 *
 *   En local :  npx hardhat node                                         (terminal 1)
 *               npx hardhat run scripts/deploy.js --network localhost    (terminal 2)
 *   Sepolia  :  npx hardhat run scripts/deploy.js --network sepolia      ⚠️ voir docs/deploiement-sepolia.md
 *
 * En local, le script déploie aussi le faux coordinateur Chainlink (mock), crée et approvisionne
 * une souscription, et y ajoute la loterie comme consumer.
 * Sur Sepolia, il vérifie d'abord la souscription, déploie, attend des confirmations, vérifie
 * le code sur Etherscan puis rappelle d'ajouter la loterie comme consumer sur vrf.chain.link.
 *
 * Dans les deux cas, l'ABI et l'adresse sont écrites dans src/contracts/.
 */
const hre = require("hardhat");
const { ethers, network, artifacts } = hre;
const { networkConfig } = require("./lib/networkConfig");
const { exportToFrontend } = require("./lib/frontendExport");

const CONFIRMATIONS = 5;

// Fonctions de lecture de la souscription (interface IVRFSubscriptionV2Plus de Chainlink)
const SUBSCRIPTION_ABI = [
  "function getSubscription(uint256 subId) view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address subOwner, address[] consumers)",
];

async function deployLocal(deployer) {
  console.log("Réseau local : déploiement du mock Chainlink VRF v2.5…");
  const Mock = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
  const vrf = await Mock.deploy(ethers.parseEther("0.1"), 1_000_000_000n, 4_000_000_000_000_000n);
  await vrf.waitForDeployment();

  const receipt = await (await vrf.createSubscription()).wait();
  const subId = receipt.logs
    .map((log) => vrf.interface.parseLog(log))
    .find((event) => event && event.name === "SubscriptionCreated").args.subId;
  await (await vrf.fundSubscriptionWithNative(subId, { value: ethers.parseEther("100") })).wait();

  const BlockLucky = await ethers.getContractFactory("BlockLucky");
  const lottery = await BlockLucky.deploy(await vrf.getAddress(), subId, ethers.id("blocklucky-local-keyhash"));
  await lottery.waitForDeployment();
  await (await vrf.addConsumer(subId, await lottery.getAddress())).wait();

  const blockNumber = await ethers.provider.getBlockNumber();
  return {
    lotteryAddress: await lottery.getAddress(),
    entry: {
      BlockLucky: await lottery.getAddress(),
      VRFCoordinator: await vrf.getAddress(),
      vrfMock: true,
      subscriptionId: subId.toString(),
      deployer: deployer.address,
      blockNumber,
      deployedAt: new Date().toISOString(),
    },
  };
}

async function deploySepolia(deployer, config) {
  const vrfCoordinator = process.env.VRF_COORDINATOR || config.vrfCoordinator;
  const keyHash = process.env.VRF_KEY_HASH || config.keyHash;
  const subIdRaw = process.env.VRF_SUBSCRIPTION_ID;

  // --- Vérifications avant de dépenser du gas ---
  if (!subIdRaw) throw new Error("VRF_SUBSCRIPTION_ID manquant dans .env (créez la souscription sur vrf.chain.link).");
  const subId = BigInt(subIdRaw);
  if (!ethers.isAddress(vrfCoordinator)) throw new Error(`VRF_COORDINATOR invalide : ${vrfCoordinator}`);
  if (!ethers.isHexString(keyHash, 32)) throw new Error(`VRF_KEY_HASH invalide : ${keyHash}`);
  if (vrfCoordinator.toLowerCase() !== config.vrfCoordinator.toLowerCase()) {
    console.warn(`⚠️  VRF_COORDINATOR (${vrfCoordinator}) diffère de la valeur documentée (${config.vrfCoordinator}).`);
  }
  if ((await ethers.provider.getCode(vrfCoordinator)) === "0x") {
    throw new Error(`Aucun contrat à l'adresse du coordinateur ${vrfCoordinator} sur ce réseau.`);
  }

  const coordinator = new ethers.Contract(vrfCoordinator, SUBSCRIPTION_ABI, ethers.provider);
  let sub;
  try {
    sub = await coordinator.getSubscription(subId);
  } catch {
    throw new Error(`La souscription ${subId} n'existe pas sur le coordinateur ${vrfCoordinator}.`);
  }
  console.log(`Souscription VRF ${subId}`);
  console.log(`   propriétaire : ${sub.subOwner}`);
  console.log(`   solde        : ${ethers.formatEther(sub.balance)} LINK, ${ethers.formatEther(sub.nativeBalance)} ETH`);
  console.log(`   consumers    : ${sub.consumers.length}`);
  if (sub.nativeBalance < ethers.parseEther("0.2")) {
    console.warn("⚠️  Moins de 0,2 ETH sur la souscription : les tirages (payés en ETH) resteront en attente tant qu'elle n'est pas approvisionnée.");
  }

  // --- Déploiement ---
  const BlockLucky = await ethers.getContractFactory("BlockLucky");
  const lottery = await BlockLucky.deploy(vrfCoordinator, subId, keyHash);
  const deployTx = lottery.deploymentTransaction();
  console.log(`\nTransaction de déploiement : ${config.explorer}/tx/${deployTx.hash}`);
  console.log(`Attente de ${CONFIRMATIONS} confirmations…`);
  const receipt = await deployTx.wait(CONFIRMATIONS);
  const lotteryAddress = await lottery.getAddress();
  console.log(`BlockLucky déployé : ${config.explorer}/address/${lotteryAddress}`);

  // --- Vérification du code source sur Etherscan ---
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVérification sur Etherscan…");
    try {
      await hre.run("verify:verify", {
        address: lotteryAddress,
        constructorArguments: [vrfCoordinator, subId, keyHash],
      });
    } catch (error) {
      if (/already verified/i.test(error.message)) {
        console.log("Contrat déjà vérifié.");
      } else {
        console.warn(`⚠️  Vérification échouée : ${error.message}`);
        console.warn(
          `   À relancer : npx hardhat verify --network sepolia ${lotteryAddress} ${vrfCoordinator} ${subId} ${keyHash}`
        );
      }
    }
  } else {
    console.warn("⚠️  ETHERSCAN_API_KEY absent : vérification Etherscan ignorée.");
  }

  return {
    lotteryAddress,
    entry: {
      BlockLucky: lotteryAddress,
      VRFCoordinator: vrfCoordinator,
      vrfMock: false,
      subscriptionId: subId.toString(),
      keyHash,
      deployer: deployer.address,
      blockNumber: receipt.blockNumber,
      deployedAt: new Date().toISOString(),
    },
  };
}

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const config = networkConfig[Number(chainId)];
  if (!config) throw new Error(`Réseau non pris en charge (chainId ${chainId}).`);

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\n🎄 Déploiement de BlockLucky sur ${network.name} (chainId ${chainId})`);
  console.log(`   Compte de la mairie : ${deployer.address} (${ethers.formatEther(balance)} ETH)\n`);

  const { lotteryAddress, entry } = config.local ? await deployLocal(deployer) : await deploySepolia(deployer, config);

  const outDir = await exportToFrontend(artifacts, chainId, entry);
  console.log(`\nABI et adresse exportées dans ${outDir}`);
  console.log(`BlockLucky : ${lotteryAddress}`);

  if (!config.local) {
    console.log("\n👉 ÉTAPE OBLIGATOIRE : ajoutez cette adresse comme « consumer » de votre souscription :");
    console.log(`   ${config.vrfApp}/${entry.subscriptionId}  →  « Add consumer »  →  ${lotteryAddress}`);
    console.log("   Sans cela, requestDraw() sera refusé par Chainlink.");
    console.log("\nEnsuite : npx hardhat run scripts/startRound.js --network sepolia");
  } else {
    console.log("\nEnsuite : npx hardhat run scripts/startRound.js --network localhost");
  }
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  process.exitCode = 1;
});

/**
 * Tests du contrat BlockLucky (section 7 du cadrage).
 * Le hasard est fourni par VRFCoordinatorV2_5Mock, le faux coordinateur Chainlink pour le local.
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Paramètres du mock Chainlink
const BASE_FEE = ethers.parseEther("0.1"); // 0,1 LINK par demande
const GAS_PRICE_LINK = 1_000_000_000n; // 1 gwei
const WEI_PER_UNIT_LINK = 4_000_000_000_000_000n; // 1 LINK = 0,004 ETH
const KEY_HASH = ethers.id("blocklucky-test-keyhash");

// Valeurs de la démo
const PRICE = ethers.parseEther("0.001");
const MAX_PARTICIPANTS = 5n;
const MAX_TICKETS = 5n;
const DURATION = 10n * 60n; // 10 minutes

// Énumération LotteryState
const CLOSED = 0n;
const OPEN = 1n;
const CALCULATING = 2n;

describe("BlockLucky", function () {
  /** Déploie le mock VRF, crée et approvisionne une souscription, déploie la loterie. */
  async function deployFixture() {
    const [mairie, alice, bob, carol, dave, erin, frank] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
    const vrf = await Mock.deploy(BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK);

    const receipt = await (await vrf.createSubscription()).wait();
    const subId = receipt.logs
      .map((log) => vrf.interface.parseLog(log))
      .find((event) => event && event.name === "SubscriptionCreated").args.subId;
    await vrf.fundSubscriptionWithNative(subId, { value: ethers.parseEther("1000") });

    const BlockLucky = await ethers.getContractFactory("BlockLucky");
    const lottery = await BlockLucky.deploy(await vrf.getAddress(), subId, KEY_HASH);
    await vrf.addConsumer(subId, await lottery.getAddress());

    return { lottery, vrf, subId, mairie, alice, bob, carol, dave, erin, frank };
  }

  /** Même chose, avec une loterie déjà ouverte aux valeurs de la démo. */
  async function openRoundFixture() {
    const ctx = await deployFixture();
    await ctx.lottery.startNewRound(PRICE, MAX_PARTICIPANTS, MAX_TICKETS, DURATION);
    return ctx;
  }

  /** Loterie ouverte avec 3 joueurs : alice (2 tickets), bob (1), carol (3). Cagnotte : 6 tickets. */
  async function threePlayersFixture() {
    const ctx = await openRoundFixture();
    const { lottery, alice, bob, carol } = ctx;
    await lottery.connect(alice).enterLottery(2, { value: PRICE * 2n });
    await lottery.connect(bob).enterLottery(1, { value: PRICE });
    await lottery.connect(carol).enterLottery(3, { value: PRICE * 3n });
    return ctx;
  }

  /** Achète 1 ticket pour chacun des signataires donnés. */
  async function buyOneEach(lottery, players) {
    for (const p of players) {
      await lottery.connect(p).enterLottery(1, { value: PRICE });
    }
  }

  /** Fait répondre le mock VRF avec un nombre aléatoire choisi (pour des tests déterministes). */
  async function fulfillWith(vrf, lottery, word) {
    return vrf.fulfillRandomWordsWithOverride(await lottery.lastRequestId(), await lottery.getAddress(), [word]);
  }

  // ===========================================================
  describe("Déploiement et ouverture", function () {
    it("est CLOSED après le déploiement et la mairie est owner", async function () {
      const { lottery, vrf, subId, mairie } = await loadFixture(deployFixture);
      expect(await lottery.state()).to.equal(CLOSED);
      expect(await lottery.owner()).to.equal(mairie.address);
      expect(await lottery.roundId()).to.equal(0n);
      expect(await lottery.vrfCoordinator()).to.equal(await vrf.getAddress());
      expect(await lottery.subscriptionId()).to.equal(subId);
      expect(await lottery.keyHash()).to.equal(KEY_HASH);
    });

    it("refuse un coordinateur ou un keyHash nuls au déploiement", async function () {
      const BlockLucky = await ethers.getContractFactory("BlockLucky");
      await expect(BlockLucky.deploy(ethers.ZeroAddress, 1n, KEY_HASH)).to.be.revertedWithCustomError(
        BlockLucky,
        "InvalidParameters"
      );
      await expect(BlockLucky.deploy(ethers.Wallet.createRandom().address, 1n, ethers.ZeroHash)).to.be.revertedWithCustomError(
        BlockLucky,
        "InvalidParameters"
      );
    });

    it("startNewRound par la mairie : OPEN, paramètres enregistrés, événement émis", async function () {
      const { lottery } = await loadFixture(deployFixture);
      const tx = lottery.startNewRound(PRICE, MAX_PARTICIPANTS, MAX_TICKETS, DURATION);
      await expect(tx).to.emit(lottery, "RoundStarted").withArgs(1n, PRICE, MAX_PARTICIPANTS, anyValue);

      const now = BigInt(await time.latest());
      expect(await lottery.state()).to.equal(OPEN);
      expect(await lottery.roundId()).to.equal(1n);
      expect(await lottery.ticketPrice()).to.equal(PRICE);
      expect(await lottery.maxParticipants()).to.equal(MAX_PARTICIPANTS);
      expect(await lottery.maxTicketsPerWallet()).to.equal(MAX_TICKETS);
      expect(await lottery.endTime()).to.equal(now + DURATION);
      expect(await lottery.timeLeft()).to.equal(DURATION);
      expect(await lottery.participantsCount()).to.equal(0n);
      expect(await lottery.getPot()).to.equal(0n);
    });

    it("startNewRound par quelqu'un d'autre est refusé", async function () {
      const { lottery, alice } = await loadFixture(deployFixture);
      await expect(lottery.connect(alice).startNewRound(PRICE, MAX_PARTICIPANTS, MAX_TICKETS, DURATION))
        .to.be.revertedWithCustomError(lottery, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("startNewRound alors qu'une loterie est OPEN est refusé", async function () {
      const { lottery } = await loadFixture(openRoundFixture);
      await expect(
        lottery.startNewRound(PRICE, MAX_PARTICIPANTS, MAX_TICKETS, DURATION)
      ).to.be.revertedWithCustomError(lottery, "LotteryNotClosed");
    });

    it("startNewRound pendant le tirage (CALCULATING) est refusé", async function () {
      const { lottery, alice, bob, carol, dave, erin } = await loadFixture(openRoundFixture);
      await buyOneEach(lottery, [alice, bob, carol, dave, erin]);
      await lottery.requestDraw();
      await expect(
        lottery.startNewRound(PRICE, MAX_PARTICIPANTS, MAX_TICKETS, DURATION)
      ).to.be.revertedWithCustomError(lottery, "LotteryNotClosed");
    });

    it("startNewRound avec un paramètre à 0 est refusé", async function () {
      const { lottery } = await loadFixture(deployFixture);
      const cases = [
        [0n, MAX_PARTICIPANTS, MAX_TICKETS, DURATION],
        [PRICE, 0n, MAX_TICKETS, DURATION],
        [PRICE, MAX_PARTICIPANTS, 0n, DURATION],
        [PRICE, MAX_PARTICIPANTS, MAX_TICKETS, 0n],
      ];
      for (const args of cases) {
        await expect(lottery.startNewRound(...args)).to.be.revertedWithCustomError(lottery, "InvalidParameters");
      }
    });
  });

  // ===========================================================
  describe("Achat de tickets", function () {
    it("achat d'1 ticket : ticket ajouté, 1 participant, cagnotte à jour, événement émis", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await expect(lottery.connect(alice).enterLottery(1, { value: PRICE }))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(1n, alice.address, 1n, PRICE);

      expect(await lottery.getTickets()).to.deep.equal([alice.address]);
      expect(await lottery.participantsCount()).to.equal(1n);
      expect(await lottery.getPot()).to.equal(PRICE);
      expect(await lottery.currentPot()).to.equal(PRICE);
      expect(await lottery.ticketsOf(1n, alice.address)).to.equal(1n);
    });

    it("achat de 3 tickets : 3 entrées dans le tirage, toujours 1 participant", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await lottery.connect(alice).enterLottery(3, { value: PRICE * 3n });
      expect(await lottery.getTickets()).to.deep.equal([alice.address, alice.address, alice.address]);
      expect(await lottery.participantsCount()).to.equal(1n);
      expect(await lottery.getPot()).to.equal(PRICE * 3n);
    });

    it("un second achat de la même adresse ne compte pas un nouveau participant", async function () {
      const { lottery, alice, bob } = await loadFixture(openRoundFixture);
      await lottery.connect(alice).enterLottery(1, { value: PRICE });
      await lottery.connect(alice).enterLottery(2, { value: PRICE * 2n });
      await lottery.connect(bob).enterLottery(1, { value: PRICE });
      expect(await lottery.participantsCount()).to.equal(2n);
      expect(await lottery.ticketsOf(1n, alice.address)).to.equal(3n);
      expect((await lottery.getTickets()).length).to.equal(4);
    });

    it("mauvais montant envoyé : refusé avec IncorrectPayment", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await expect(lottery.connect(alice).enterLottery(2, { value: PRICE }))
        .to.be.revertedWithCustomError(lottery, "IncorrectPayment")
        .withArgs(PRICE * 2n, PRICE);
      await expect(lottery.connect(alice).enterLottery(1, { value: PRICE + 1n }))
        .to.be.revertedWithCustomError(lottery, "IncorrectPayment")
        .withArgs(PRICE, PRICE + 1n);
    });

    it("quantité 0 : refusée", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await expect(lottery.connect(alice).enterLottery(0, { value: 0 })).to.be.revertedWithCustomError(
        lottery,
        "InvalidQuantity"
      );
    });

    it("dépassement de maxTicketsPerWallet en un seul achat : refusé", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await expect(lottery.connect(alice).enterLottery(6, { value: PRICE * 6n }))
        .to.be.revertedWithCustomError(lottery, "TicketLimitReached")
        .withArgs(MAX_TICKETS);
    });

    it("dépassement de maxTicketsPerWallet en plusieurs achats : refusé", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await lottery.connect(alice).enterLottery(3, { value: PRICE * 3n });
      await lottery.connect(alice).enterLottery(2, { value: PRICE * 2n }); // 5 : la limite
      await expect(lottery.connect(alice).enterLottery(1, { value: PRICE }))
        .to.be.revertedWithCustomError(lottery, "TicketLimitReached")
        .withArgs(MAX_TICKETS);
    });

    it("une quantité énorme est refusée proprement (pas de dépassement de capacité)", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await expect(lottery.connect(alice).enterLottery(ethers.MaxUint256, { value: 0 }))
        .to.be.revertedWithCustomError(lottery, "TicketLimitReached")
        .withArgs(MAX_TICKETS);
    });

    it("achat après endTime : refusé", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await time.increase(DURATION);
      expect(await lottery.timeLeft()).to.equal(0n);
      await expect(lottery.connect(alice).enterLottery(1, { value: PRICE })).to.be.revertedWithCustomError(
        lottery,
        "LotteryEnded"
      );
    });

    it("achat une fois maxParticipants atteint : refusé", async function () {
      const { lottery, alice, bob, carol, dave, erin, frank } = await loadFixture(openRoundFixture);
      await buyOneEach(lottery, [alice, bob, carol, dave, erin]);
      await expect(lottery.connect(frank).enterLottery(1, { value: PRICE })).to.be.revertedWithCustomError(
        lottery,
        "LotteryEnded"
      );
    });

    it("achat quand aucune loterie n'est ouverte (CLOSED) : refusé", async function () {
      const { lottery, alice } = await loadFixture(deployFixture);
      await expect(lottery.connect(alice).enterLottery(1, { value: PRICE })).to.be.revertedWithCustomError(
        lottery,
        "LotteryNotOpen"
      );
    });

    it("un envoi direct d'ETH au contrat (hors achat) est rejeté", async function () {
      const { lottery, alice } = await loadFixture(openRoundFixture);
      await expect(alice.sendTransaction({ to: await lottery.getAddress(), value: PRICE })).to.be.reverted;
    });
  });

  // ===========================================================
  describe("Tirage", function () {
    it("requestDraw avant la fin : refusé avec DrawConditionsNotMet", async function () {
      const { lottery } = await loadFixture(threePlayersFixture);
      expect(await lottery.canDraw()).to.equal(false);
      await expect(lottery.requestDraw()).to.be.revertedWithCustomError(lottery, "DrawConditionsNotMet");
    });

    it("requestDraw quand maxParticipants est atteint : accepté, état CALCULATING", async function () {
      const { lottery, alice, bob, carol, dave, erin } = await loadFixture(openRoundFixture);
      await buyOneEach(lottery, [alice, bob, carol, dave, erin]);
      expect(await lottery.canDraw()).to.equal(true);
      await expect(lottery.requestDraw()).to.emit(lottery, "DrawRequested").withArgs(1n, anyValue);
      expect(await lottery.state()).to.equal(CALCULATING);
      expect(await lottery.lastRequestId()).to.not.equal(0n);
      expect(await lottery.canDraw()).to.equal(false);
    });

    it("requestDraw après endTime : accepté", async function () {
      const { lottery } = await loadFixture(threePlayersFixture);
      await time.increase(DURATION);
      expect(await lottery.canDraw()).to.equal(true);
      await expect(lottery.requestDraw()).to.emit(lottery, "DrawRequested");
      expect(await lottery.state()).to.equal(CALCULATING);
    });

    it("requestDraw par une adresse quelconque (pas la mairie) : accepté", async function () {
      const { lottery, frank } = await loadFixture(threePlayersFixture);
      await time.increase(DURATION);
      await expect(lottery.connect(frank).requestDraw()).to.emit(lottery, "DrawRequested");
      expect(await lottery.state()).to.equal(CALCULATING);
    });

    it("requestDraw sans aucun ticket : loterie fermée sans gagnant", async function () {
      const { lottery } = await loadFixture(openRoundFixture);
      await time.increase(DURATION);
      await expect(lottery.requestDraw()).to.emit(lottery, "RoundClosedWithoutWinner").withArgs(1n);
      expect(await lottery.state()).to.equal(CLOSED);
      expect(await lottery.lastRequestId()).to.equal(0n); // aucune demande à Chainlink
      const result = await lottery.results(1n);
      expect(result.winner).to.equal(ethers.ZeroAddress);
      expect(result.prize).to.equal(0n);
      expect(result.ticketsSold).to.equal(0n);
    });

    it("requestDraw quand aucune loterie n'est ouverte : refusé", async function () {
      const { lottery } = await loadFixture(deployFixture);
      await expect(lottery.requestDraw()).to.be.revertedWithCustomError(lottery, "LotteryNotOpen");
    });

    it("achat pendant CALCULATING : refusé", async function () {
      const { lottery, alice, bob, carol, dave, erin } = await loadFixture(openRoundFixture);
      await buyOneEach(lottery, [alice, bob, carol, dave, erin]);
      await lottery.requestDraw();
      await expect(lottery.connect(alice).enterLottery(1, { value: PRICE })).to.be.revertedWithCustomError(
        lottery,
        "LotteryNotOpen"
      );
    });

    it("double requestDraw : refusé", async function () {
      const { lottery } = await loadFixture(threePlayersFixture);
      await time.increase(DURATION);
      await lottery.requestDraw();
      await expect(lottery.requestDraw()).to.be.revertedWithCustomError(lottery, "LotteryNotOpen");
    });
  });

  // ===========================================================
  describe("Gagnant et paiement", function () {
    /** Tirage terminé avec 3 joueurs et la réponse « naturelle » du mock. */
    async function drawnFixture() {
      const ctx = await threePlayersFixture();
      await time.increase(DURATION);
      await ctx.lottery.requestDraw();
      return ctx;
    }

    it("après la réponse du mock VRF, le gagnant fait partie des joueurs", async function () {
      const { lottery, vrf, alice, bob, carol } = await loadFixture(drawnFixture);
      await expect(vrf.fulfillRandomWords(await lottery.lastRequestId(), await lottery.getAddress())).to.emit(
        lottery,
        "WinnerPicked"
      );
      const { winner } = await lottery.results(1n);
      expect([alice.address, bob.address, carol.address]).to.include(winner);
    });

    it("le tirage est payé en ETH par la souscription (nativePayment), pas en LINK", async function () {
      const { lottery, vrf, subId } = await loadFixture(drawnFixture);
      const before = await vrf.getSubscription(subId);
      await vrf.fulfillRandomWords(await lottery.lastRequestId(), await lottery.getAddress());
      const after = await vrf.getSubscription(subId);
      expect(after.nativeBalance).to.be.lessThan(before.nativeBalance);
      expect(after.balance).to.equal(before.balance);
    });

    it("le gagnant est désigné par randomWords[0] % nombre de tickets", async function () {
      // Tickets : [alice, alice, bob, carol, carol, carol] → 8 % 6 = 2 → bob
      const { lottery, vrf, bob } = await loadFixture(drawnFixture);
      await expect(fulfillWith(vrf, lottery, 8n))
        .to.emit(lottery, "WinnerPicked")
        .withArgs(1n, bob.address, PRICE * 6n);
    });

    it("le gagnant reçoit toute la cagnotte (soldes avant / après)", async function () {
      const { lottery, vrf, carol } = await loadFixture(drawnFixture);
      const pot = await lottery.getPot();
      expect(pot).to.equal(PRICE * 6n);

      // 5 % 6 = 5 → carol. La transaction est envoyée par la mairie (via le mock) :
      // carol ne paie pas de gas, son solde doit augmenter exactement de la cagnotte.
      await expect(fulfillWith(vrf, lottery, 5n)).to.changeEtherBalances(
        [carol, lottery],
        [pot, -pot]
      );
      expect(await lottery.getPot()).to.equal(0n);
      expect(await lottery.pendingWithdrawals(carol.address)).to.equal(0n);
    });

    it("results[roundId] est enregistré et l'état revient à CLOSED", async function () {
      const { lottery, vrf, alice } = await loadFixture(drawnFixture);
      await fulfillWith(vrf, lottery, 0n); // index 0 → alice
      const block = await ethers.provider.getBlock("latest");
      const result = await lottery.results(1n);
      expect(result.winner).to.equal(alice.address);
      expect(result.prize).to.equal(PRICE * 6n);
      expect(result.timestamp).to.equal(BigInt(block.timestamp));
      expect(result.ticketsSold).to.equal(6n);
      expect(await lottery.state()).to.equal(CLOSED);
    });

    it("seul le coordinateur VRF peut fournir le nombre aléatoire", async function () {
      const { lottery, vrf, mairie } = await loadFixture(drawnFixture);
      const requestId = await lottery.lastRequestId();
      await expect(lottery.connect(mairie).rawFulfillRandomWords(requestId, [0n]))
        .to.be.revertedWithCustomError(lottery, "OnlyCoordinatorCanFulfill")
        .withArgs(mairie.address, await vrf.getAddress());
    });

    it("une réponse VRF qui ne correspond pas à la demande en cours est ignorée", async function () {
      const { lottery, vrf } = await loadFixture(drawnFixture);
      const requestId = await lottery.lastRequestId();
      // Le coordinateur appelle la loterie avec un autre identifiant : rejet UnknownRequest
      const vrfAddress = await vrf.getAddress();
      await ethers.provider.send("hardhat_impersonateAccount", [vrfAddress]);
      await ethers.provider.send("hardhat_setBalance", [vrfAddress, "0xDE0B6B3A7640000"]);
      const fakeVrf = await ethers.getSigner(vrfAddress);
      await expect(
        lottery.connect(fakeVrf).rawFulfillRandomWords(requestId + 1n, [0n])
      ).to.be.revertedWithCustomError(lottery, "UnknownRequest");
      // La bonne demande, elle, aboutit ; une seconde réponse est ensuite rejetée
      await lottery.connect(fakeVrf).rawFulfillRandomWords(requestId, [0n]);
      await expect(lottery.connect(fakeVrf).rawFulfillRandomWords(requestId, [1n])).to.be.revertedWithCustomError(
        lottery,
        "UnknownRequest"
      );
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [vrfAddress]);
    });

    it("gagnant qui refuse les ETH : gains crédités, puis withdrawPrize() fonctionne", async function () {
      const { lottery, vrf } = await loadFixture(openRoundFixture);
      const rejecter = await (await ethers.getContractFactory("RejectEther")).deploy();
      const lotteryAddress = await lottery.getAddress();
      const rejecterAddress = await rejecter.getAddress();

      await rejecter.enter(lotteryAddress, 2, { value: PRICE * 2n });
      await time.increase(DURATION);
      await lottery.requestDraw();

      // Seul joueur : il gagne forcément, mais refuse l'envoi automatique
      await expect(fulfillWith(vrf, lottery, 1n))
        .to.emit(lottery, "PrizeCredited")
        .withArgs(rejecterAddress, PRICE * 2n);
      expect(await lottery.state()).to.equal(CLOSED); // la loterie n'est pas bloquée
      expect(await lottery.pendingWithdrawals(rejecterAddress)).to.equal(PRICE * 2n);
      expect((await lottery.results(1n)).winner).to.equal(rejecterAddress);

      // Tant qu'il refuse les ETH, le retrait échoue (et rien n'est perdu)
      await expect(rejecter.withdraw(lotteryAddress)).to.be.revertedWithCustomError(lottery, "TransferFailed");
      expect(await lottery.pendingWithdrawals(rejecterAddress)).to.equal(PRICE * 2n);

      // Il accepte les ETH : il récupère ses gains
      await rejecter.setAcceptEther(true);
      const withdrawTx = rejecter.withdraw(lotteryAddress);
      await expect(withdrawTx).to.emit(lottery, "PrizeWithdrawn").withArgs(rejecterAddress, PRICE * 2n);
      await expect(withdrawTx).to.changeEtherBalances([rejecter, lottery], [PRICE * 2n, -(PRICE * 2n)]);
      expect(await lottery.pendingWithdrawals(rejecterAddress)).to.equal(0n);
    });

    it("withdrawPrize() sans gains dus : refusé", async function () {
      const { lottery, alice } = await loadFixture(deployFixture);
      await expect(lottery.connect(alice).withdrawPrize()).to.be.revertedWithCustomError(lottery, "NothingToWithdraw");
    });

    it("une tentative de réentrance sur withdrawPrize() échoue", async function () {
      const { lottery, vrf } = await loadFixture(openRoundFixture);
      const lotteryAddress = await lottery.getAddress();
      const attacker = await (await ethers.getContractFactory("ReentrancyAttacker")).deploy(lotteryAddress);
      const attackerAddress = await attacker.getAddress();

      // Le contrat attaquant et un joueur honnête participent ; l'attaquant gagne (index 0)
      await attacker.enter(1, { value: PRICE });
      const [, , bob] = await ethers.getSigners();
      await lottery.connect(bob).enterLottery(1, { value: PRICE });
      await time.increase(DURATION);
      await lottery.requestDraw();
      await expect(fulfillWith(vrf, lottery, 0n)).to.emit(lottery, "PrizeCredited");

      // Attaque : retrait + tentative de second retrait pendant la réception
      await expect(attacker.attack()).to.changeEtherBalances([attacker, lottery], [PRICE * 2n, -(PRICE * 2n)]);

      expect(await attacker.reentryAttempts()).to.equal(1n);
      expect(await attacker.reentrySuccesses()).to.equal(0n);
      const expectedError = lottery.interface.getError("ReentrancyGuardReentrantCall").selector;
      expect(await attacker.lastRevertData()).to.equal(expectedError);
      expect(await lottery.pendingWithdrawals(attackerAddress)).to.equal(0n);
      expect(await ethers.provider.getBalance(lotteryAddress)).to.equal(0n);
    });

    it("une nouvelle loterie peut être ouverte après la précédente, compteurs à zéro", async function () {
      const { lottery, vrf, alice, dave } = await loadFixture(drawnFixture);
      await fulfillWith(vrf, lottery, 0n);

      await expect(lottery.startNewRound(PRICE * 2n, 3n, 2n, DURATION))
        .to.emit(lottery, "RoundStarted")
        .withArgs(2n, PRICE * 2n, 3n, anyValue);
      expect(await lottery.roundId()).to.equal(2n);
      expect(await lottery.state()).to.equal(OPEN);
      expect(await lottery.participantsCount()).to.equal(0n);
      expect(await lottery.getPot()).to.equal(0n);
      expect(await lottery.getTickets()).to.deep.equal([]);
      expect(await lottery.ticketsOf(2n, alice.address)).to.equal(0n);
      expect(await lottery.ticketPrice()).to.equal(PRICE * 2n);

      // Alice peut rejouer avec le nouveau plafond (2 tickets)
      await lottery.connect(alice).enterLottery(2, { value: PRICE * 4n });
      await lottery.connect(dave).enterLottery(1, { value: PRICE * 2n });
      expect(await lottery.participantsCount()).to.equal(2n);
      expect(await lottery.getTickets()).to.deep.equal([alice.address, alice.address, dave.address]);
      // L'historique de la loterie 1 est conservé
      expect((await lottery.results(1n)).ticketsSold).to.equal(6n);
    });
  });

  // ===========================================================
  describe("Relance du tirage (retryDraw)", function () {
    async function pendingDrawFixture() {
      const ctx = await threePlayersFixture();
      await time.increase(DURATION);
      await ctx.lottery.requestDraw();
      return ctx;
    }

    it("refusée si aucun tirage n'est en attente", async function () {
      const { lottery } = await loadFixture(openRoundFixture);
      await expect(lottery.retryDraw()).to.be.revertedWithCustomError(lottery, "NoPendingDraw");
    });

    it("refusée avant DRAW_TIMEOUT", async function () {
      const { lottery } = await loadFixture(pendingDrawFixture);
      const availableAt = (await lottery.drawRequestedAt()) + (await lottery.DRAW_TIMEOUT());
      await expect(lottery.retryDraw()).to.be.revertedWithCustomError(lottery, "RetryTooEarly").withArgs(availableAt);
    });

    it("après DRAW_TIMEOUT, n'importe qui relance ; l'ancienne réponse est ignorée", async function () {
      const { lottery, vrf, frank, bob } = await loadFixture(pendingDrawFixture);
      const oldRequestId = await lottery.lastRequestId();
      await time.increase(await lottery.DRAW_TIMEOUT());

      await expect(lottery.connect(frank).retryDraw()).to.emit(lottery, "DrawRequested").withArgs(1n, anyValue);
      const newRequestId = await lottery.lastRequestId();
      expect(newRequestId).to.not.equal(oldRequestId);
      expect(await lottery.state()).to.equal(CALCULATING);

      // Réponse tardive à l'ancienne demande : rejetée par la loterie, rien ne change
      await vrf.fulfillRandomWordsWithOverride(oldRequestId, await lottery.getAddress(), [0n]);
      expect(await lottery.state()).to.equal(CALCULATING);
      expect((await lottery.results(1n)).winner).to.equal(ethers.ZeroAddress);

      // Réponse à la nouvelle demande : tirage normal (8 % 6 = 2 → bob)
      await expect(fulfillWith(vrf, lottery, 8n))
        .to.emit(lottery, "WinnerPicked")
        .withArgs(1n, bob.address, PRICE * 6n);
      expect(await lottery.state()).to.equal(CLOSED);
    });
  });

  // ===========================================================
  describe("Pouvoirs de la mairie (sécurité)", function () {
    it("les seules fonctions qui modifient l'état sont celles prévues (ni setCoordinator, ni retrait mairie)", async function () {
      const { lottery } = await loadFixture(deployFixture);
      const writeFunctions = lottery.interface.fragments
        .filter((f) => f.type === "function" && !["view", "pure"].includes(f.stateMutability))
        .map((f) => f.name)
        .sort();
      expect(writeFunctions).to.deep.equal(
        [
          // Loterie
          "enterLottery",
          "rawFulfillRandomWords", // coordinateur VRF uniquement
          "requestDraw",
          "retryDraw",
          "startNewRound", // mairie uniquement
          "withdrawPrize", // gagnant uniquement
          // Ownable2Step (gestion du propriétaire, sans accès aux fonds)
          "acceptOwnership",
          "renounceOwnership",
          "transferOwnership",
        ].sort()
      );
    });

    it("la mairie ne peut pas retirer la cagnotte via withdrawPrize", async function () {
      const { lottery } = await loadFixture(threePlayersFixture);
      await expect(lottery.withdrawPrize()).to.be.revertedWithCustomError(lottery, "NothingToWithdraw");
      expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(PRICE * 6n);
    });

    it("la propriété se transfère en deux étapes (Ownable2Step)", async function () {
      const { lottery, alice } = await loadFixture(deployFixture);
      await lottery.transferOwnership(alice.address);
      expect(await lottery.owner()).to.not.equal(alice.address); // pas encore acceptée
      await lottery.connect(alice).acceptOwnership();
      expect(await lottery.owner()).to.equal(alice.address);
    });
  });
});

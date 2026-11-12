import SwiftUI

// MARK: - Page de la loterie d'une ville (aux couleurs de la ville)

struct LotteryView: View {
    let city: City
    @State private var lottery: Chain.Lottery?
    @State private var error: String?
    @State private var copied = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        let t = Theme.of(city)
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero(t)
                VStack(alignment: .leading, spacing: 20) {
                    if let error {
                        Card { Label(error, systemImage: "wifi.exclamationmark").foregroundStyle(t.festive) }
                    }
                    if let l = lottery {
                        TicketCard(lottery: l)
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            stats(l, now: context.date)
                        }
                        drawInfo(l)
                        HowItWorks()
                        transparency(l, t)
                    } else if error == nil {
                        ProgressView("Lecture de la blockchain…").frame(maxWidth: .infinity).padding(.top, 60)
                    }
                }
                .padding(16)
                .padding(.top, -36) // le ticket chevauche le bandeau
            }
        }
        .background(t.bg.ignoresSafeArea())
        .foregroundStyle(t.ink)
        .environment(\.theme, t)
        .preferredColorScheme(t.dark ? .dark : .light)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbarColorScheme(t.onPrimary == .white ? .dark : .light, for: .navigationBar) // flèche lisible sur le bandeau
        .tint(t.onPrimary)
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) { buyBar(t) }
        .refreshable { await load() }
        .task {
            // Relecture toutes les 15 s tant que la page est ouverte.
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(15))
            }
        }
        .sensoryFeedback(.success, trigger: copied)
    }

    static let dateFormat = Date.FormatStyle(date: .long, time: .shortened, locale: Locale(identifier: "fr_FR"))

    // MARK: Bandeau

    func hero(_ t: Theme) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if let lottery {
                StatusPill(text: lottery.statusText, live: lottery.isSelling, foreground: t.onPrimary, background: .black.opacity(0.18))
            }
            Text("La loterie des fêtes").font(.headline).opacity(0.85)
            Text(city.name).font(t.title(.largeTitle)).lineLimit(2).minimumScaleFactor(0.7)
            if let lottery, lottery.roundId > 0 {
                Text("Loterie n°\(lottery.roundId)").font(.subheadline).opacity(0.85)
            }
        }
        .foregroundStyle(t.onPrimary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 56)
        .background(alignment: .topTrailing) {
            Image(systemName: "cube.transparent").font(.system(size: 170, weight: .ultraLight))
                .foregroundStyle(t.onPrimary.opacity(0.1)).offset(x: 40, y: -30)
                .accessibilityHidden(true)
        }
        .background(
            LinearGradient(colors: [t.primary, t.primary.opacity(0.8)], startPoint: .center, endPoint: .bottom)
                .padding(.top, -600) // le dégradé remonte sous la barre de navigation, même en tirant la page vers le bas
        )
    }

    // MARK: Chiffres

    func stats(_ l: Chain.Lottery, now: Date) -> some View {
        VStack(spacing: 12) {
            Card {
                HStack {
                    Label("Participants", systemImage: "person.2.fill").font(.subheadline.weight(.semibold))
                        .labelStyle(TintedIconLabel(tint: Theme.of(city).primary))
                    Spacer()
                    Text("\(l.participants) sur \(l.maxParticipants)").font(.subheadline.weight(.bold).monospacedDigit())
                }
                ProgressBar(value: l.progress)
                Text(l.progress >= 1 ? "Nombre de participants atteint." : "Le tirage a lieu quand la jauge est pleine ou à la fin du temps.")
                    .font(.caption).foregroundStyle(Theme.of(city).ink2)
            }
            .accessibilityElement(children: .combine)
            Card {
                Label(l.state == 1 && l.endTime > now ? "Fin de la vente dans" : "Vente terminée",
                      systemImage: "clock.fill").font(.subheadline.weight(.semibold))
                    .labelStyle(TintedIconLabel(tint: Theme.of(city).primary))
                if l.state == 1, l.endTime > now {
                    Countdown(seconds: Int(l.endTime.timeIntervalSince(now)))
                } else {
                    Text(l.endTime.formatted(Self.dateFormat)).font(.title3.weight(.bold))
                }
            }
        }
    }

    // MARK: Tirage

    @ViewBuilder
    func drawInfo(_ l: Chain.Lottery) -> some View {
        let t = Theme.of(city)
        if let result = l.result {
            Card {
                SectionTitle(title: result.winner == nil ? "Loterie clôturée" : "Le gagnant", icon: result.winner == nil ? "xmark.seal" : "trophy.fill")
                if let winner = result.winner {
                    Text(Chain.short(winner)).font(.title2.weight(.bold).monospaced()).foregroundStyle(t.primary)
                    Text("a remporté \(Chain.eth(result.prize)), le \(result.date.formatted(Self.dateFormat)).")
                        .font(.subheadline).foregroundStyle(t.ink2)
                } else {
                    Text("Aucun ticket n'a été vendu : pas de gagnant pour cette loterie.").font(.subheadline).foregroundStyle(t.ink2)
                }
            }
        } else if l.state == 2 {
            Card {
                HStack(spacing: 10) {
                    ProgressView().tint(t.primary)
                    Text("Tirage en cours").font(t.title(.headline))
                }
                Text("Chainlink calcule un nombre aléatoire et la preuve qu'il n'a pas été truqué. Cela prend en général une à trois minutes.")
                    .font(.subheadline).foregroundStyle(t.ink2)
            }
        } else if l.canDraw {
            // Comme sur le site : la page publique informe, c'est la mairie qui lance le tirage.
            Card {
                SectionTitle(title: "La vente est terminée", icon: "flag.checkered")
                Text(l.ticketsSold == 0
                     ? "Aucun ticket n'a été vendu : la mairie va clôturer cette loterie sans gagnant, puis pourra en ouvrir une nouvelle."
                     : "La mairie va lancer le tirage. Le gagnant est choisi par Chainlink, un service de hasard vérifiable : personne ne peut influencer le résultat.")
                    .font(.subheadline).foregroundStyle(t.ink2)
            }
        }
    }

    // MARK: Transparence

    func transparency(_ l: Chain.Lottery, _ t: Theme) -> some View {
        Card {
            SectionTitle(title: "Transparence", icon: "checkmark.shield.fill")
            Text("Le règlement est un programme public : ni la mairie ni personne ne peut choisir le gagnant ou retirer la cagnotte.")
                .font(.subheadline).foregroundStyle(t.ink2)
            if let address = city.address {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Adresse du contrat").font(.caption).foregroundStyle(t.ink2)
                        Text(Chain.short(address)).font(.body.monospaced().weight(.semibold))
                    }
                    Spacer()
                    Button {
                        UIPasteboard.general.string = address
                        copied.toggle()
                    } label: {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc").frame(width: 44, height: 44)
                    }
                    .foregroundStyle(t.primary)
                    .accessibilityLabel("Copier l'adresse du contrat")
                }
                .padding(12)
                .background(t.surface2, in: RoundedRectangle(cornerRadius: t.radius))
                if let url = URL(string: Chain.explorer + address) {
                    Link(destination: url) {
                        Label("Vérifier sur Etherscan", systemImage: "arrow.up.right.square").font(.subheadline.weight(.semibold))
                    }
                    .foregroundStyle(t.primary)
                    .frame(minHeight: 44)
                }
            }
        }
    }

    // MARK: Achat

    @ViewBuilder
    func buyBar(_ t: Theme) -> some View {
        if let l = lottery, l.isSelling {
            PrimaryButton(title: "Acheter des tickets", subtitle: "\(Chain.eth(l.ticketPrice)) le ticket · dans l'app MetaMask",
                          icon: "ticket.fill") { openURL(metamaskLink) }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
        }
    }

    /// Ouvre la page de la ville dans le navigateur intégré de MetaMask, qui signe la transaction.
    var metamaskLink: URL {
        URL(string: "https://metamask.app.link/dapp/\(SITE.host()!)/ville/\(city.slug)")!
    }

    func load() async {
        guard let address = city.address else { error = "Cette ville n'a pas encore de contrat."; return }
        do {
            let l = try await Chain.read(address)
            withAnimation(.snappy) { lottery = l }
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Le ticket : cagnotte, prix et garanties

struct TicketCard: View {
    @Environment(\.theme) private var t
    let lottery: Chain.Lottery

    var body: some View {
        let shape = TicketShape(radius: t.radius + 6, notchAt: 0.7)
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Cagnotte").font(.subheadline.weight(.semibold)).foregroundStyle(t.ink2)
                Text(Chain.eth(lottery.pot)).font(t.title(.largeTitle)).foregroundStyle(t.primary)
                    .contentTransition(.numericText()).minimumScaleFactor(0.6).lineLimit(1)
                HStack(spacing: 14) {
                    Label("\(lottery.ticketsSold) ticket\(lottery.ticketsSold > 1 ? "s" : "") vendu\(lottery.ticketsSold > 1 ? "s" : "")",
                          systemImage: "ticket")
                    Label("\(Chain.eth(lottery.ticketPrice)) l'unité", systemImage: "tag")
                }
                .font(.footnote.weight(.medium)).foregroundStyle(t.ink2)
                .labelStyle(TintedIconLabel(tint: t.festive))
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: 150, alignment: .top)

            Line().stroke(t.line, style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
                .frame(height: 1).padding(.horizontal, 22)

            HStack {
                Label("100 % au gagnant", systemImage: "trophy.fill")
                Spacer()
                Label("Max \(lottery.maxTickets) par personne", systemImage: "person.fill")
            }
            .font(.caption.weight(.semibold)).foregroundStyle(t.ink)
            .labelStyle(TintedIconLabel(tint: t.festive))
            .padding(.horizontal, 20)
            .frame(height: 64)
        }
        .background(t.surface, in: shape)
        .overlay(shape.stroke(t.line))
        .shadow(color: .black.opacity(t.dark ? 0.35 : 0.1), radius: 16, y: 8)
        .accessibilityElement(children: .combine)
    }
}

/// Le pointillé du talon du ticket.
struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        Path { $0.move(to: CGPoint(x: rect.minX, y: rect.midY)); $0.addLine(to: CGPoint(x: rect.maxX, y: rect.midY)) }
    }
}

/// Compte à rebours en cases : jours, heures, minutes, secondes.
struct Countdown: View {
    @Environment(\.theme) private var t
    let seconds: Int

    var body: some View {
        let parts = [(seconds / 86400, "jours"), (seconds % 86400 / 3600, "heures"), (seconds % 3600 / 60, "min"), (seconds % 60, "s")]
        HStack(spacing: 8) {
            ForEach(parts.indices, id: \.self) { i in
                VStack(spacing: 2) {
                    Text(String(format: "%02d", parts[i].0)).font(.title.weight(.bold).monospacedDigit())
                        .contentTransition(.numericText(countsDown: true))
                    Text(parts[i].1).font(.caption2.weight(.semibold)).textCase(.uppercase).foregroundStyle(t.ink2)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(t.surface2, in: RoundedRectangle(cornerRadius: t.radius))
            }
        }
        .animation(.snappy, value: seconds)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(parts[0].0) jours, \(parts[1].0) heures, \(parts[2].0) minutes")
    }
}

/// « Comment ça marche » en 3 étapes, comme sur le site.
struct HowItWorks: View {
    @Environment(\.theme) private var t
    private let steps = [
        ("wallet.bifold.fill", "Ouvrez MetaMask", "Une application gratuite qui garde vos ethers de test. On joue sans vrai argent."),
        ("ticket.fill", "Achetez vos tickets", "De 1 à 5 tickets par personne. Chaque achat est visible par tous."),
        ("sparkles", "Chainlink tire le gagnant", "À la fin de la vente, la mairie lance le tirage. Toute la cagnotte va au gagnant."),
    ]

    var body: some View {
        Card {
            SectionTitle(title: "Comment ça marche", icon: "questionmark.circle.fill")
            ForEach(steps.indices, id: \.self) { i in
                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: steps[i].0).font(.body.weight(.semibold)).foregroundStyle(t.onPrimary)
                        .frame(width: 40, height: 40)
                        .background(t.primary, in: RoundedRectangle(cornerRadius: t.radius))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(i + 1). \(steps[i].1)").font(.subheadline.weight(.bold))
                        Text(steps[i].2).font(.footnote).foregroundStyle(t.ink2).fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.top, 4)
                .accessibilityElement(children: .combine)
            }
        }
    }
}

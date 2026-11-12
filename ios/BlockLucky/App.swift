import SwiftUI

@main
struct BlockLuckyApp: App {
    var body: some Scene {
        WindowGroup { CitiesView() }
    }
}

// MARK: - Accueil : ce que l'on voit dépend du compte connecté

struct CitiesView: View {
    @State private var cities: [City] = []
    @State private var mine: [City]?      // villes du compte connecté (nil : pas encore calculé)
    @State private var me: Me?
    @State private var error: String?
    @State private var loaded = false
    @State private var showAccount = false
    @State private var showAuth = false
    @State private var browseAll = false  // habitant inscrit nulle part qui veut quand même découvrir les villes
    @State private var path: [String] = []
    private let t = Theme.sobre

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    hero
                    if let error {
                        Card { Label(error, systemImage: "wifi.exclamationmark").foregroundStyle(t.festive) }
                    }
                    content
                    footer
                }
                .padding(16)
            }
            .background(t.bg.ignoresSafeArea())
            .environment(\.theme, t)
            .navigationDestination(for: String.self) { slug in
                if let city = cities.first(where: { $0.slug == slug }) { LotteryView(city: city) }
            }
            .toolbar {
                Button { if me == nil { showAuth = true } else { showAccount = true } } label: {
                    Image(systemName: me == nil ? "person.crop.circle" : "person.crop.circle.badge.checkmark").font(.title3)
                }
                .accessibilityLabel(me == nil ? "Connexion" : me?.role == "mairie" ? "Espace mairie" : "Mon compte")
            }
            .sheet(isPresented: $showAccount, onDismiss: { Task { await load() } }) {
                if me?.role == "mairie" { MairieView(me: $me) } else { AccountView(me: $me) }
            }
            .fullScreenCover(isPresented: $showAuth, onDismiss: { Task { await load() } }) { AuthView(me: $me) }
            .refreshable { await load() }
            .task { await load() }
        }
        .tint(t.primary)
    }

    @ViewBuilder
    var content: some View {
        if !loaded {
            ForEach(0..<2, id: \.self) { _ in CityCard.placeholder }
        } else if me == nil {
            // Visiteur : on l'invite à se connecter, et il peut découvrir les villes.
            LoginPrompt { showAuth = true }
            cityList("Découvrir les villes", icon: "building.columns", cities)
        } else if let mine {
            if mine.isEmpty {
                NoLotteryView(email: me?.email ?? "", onRefresh: { Task { await load() } },
                              onBrowse: { withAnimation { browseAll.toggle() } }, browsing: browseAll)
                if browseAll { cityList("Toutes les villes", icon: "building.columns", cities) }
            } else {
                cityList(me?.role == "admin" ? "Toutes les villes" : mine.count == 1 ? "Votre loterie" : "Vos loteries",
                         icon: "ticket.fill", mine)
            }
        }
    }

    func cityList(_ title: String, icon: String, _ list: [City]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(title: title, icon: icon)
            ForEach(list) { city in
                NavigationLink(value: city.slug) { CityCard(city: city) }.buttonStyle(PressableStyle())
            }
        }
    }

    var hero: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 14) {
                Image("Logo").resizable().frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .shadow(color: t.primary.opacity(0.3), radius: 10, y: 5)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("BlockLucky").font(.largeTitle.weight(.heavy)).foregroundStyle(t.ink)
                    Text(subtitle).font(.subheadline).foregroundStyle(t.ink2).lineLimit(2)
                }
            }
            HStack(spacing: 8) {
                Promise(icon: "eye", text: "Tout est public")
                Promise(icon: "dice", text: "Hasard vérifiable")
                Promise(icon: "trophy", text: "100 % au gagnant")
            }
        }
        .padding(.top, 4)
    }

    var subtitle: String {
        guard let me else { return "La loterie des fêtes de votre ville" }
        switch me.role {
        case "mairie": return "Espace mairie · \(me.email)"
        case "admin": return "Administration · \(me.email)"
        default: return "Bonjour \(me.email)"
        }
    }

    var footer: some View {
        Text("Réseau de test Sepolia : on joue avec des ethers fictifs, aucun vrai argent n'est en jeu.")
            .font(.footnote).foregroundStyle(t.ink2)
            .frame(maxWidth: .infinity)
            .multilineTextAlignment(.center)
            .padding(.top, 8)
    }

    func load() async {
        do {
            cities = try await API.cities()
            me = try? await API.me()
            if let me { mine = await API.myCities(me, among: cities) } else { mine = nil; browseAll = false }
            #if DEBUG
            // Captures du simulateur sans vrai compte. SIMCTL_CHILD_DEMO_ME=aucune : habitant inscrit nulle part ;
            // SIMCTL_CHILD_DEMO_ME=<slug> : habitant inscrit dans cette ville.
            if let demo = ProcessInfo.processInfo.environment["DEMO_ME"] {
                me = Me(role: "participant", email: "habitant@exemple.fr")
                mine = cities.filter { $0.slug == demo }
            }
            if ProcessInfo.processInfo.environment["AUTH"] != nil, me == nil, !loaded { showAuth = true }
            #endif
            error = nil
            if path.isEmpty, let slug = ProcessInfo.processInfo.environment["CITY"] { path = [slug] }
        } catch { self.error = "Impossible de charger les villes. Tirez vers le bas pour réessayer." }
        withAnimation { loaded = true }
    }
}

/// Visiteur non connecté : pourquoi se connecter.
struct LoginPrompt: View {
    @Environment(\.theme) private var t
    let action: () -> Void
    var body: some View {
        Card(padding: 18) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "envelope.badge.fill").font(.title2).foregroundStyle(t.primary)
                    .frame(width: 48, height: 48).background(t.primary.opacity(0.1), in: Circle())
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Retrouvez la loterie de votre ville").font(.headline)
                    Text("Connectez-vous avec l'adresse mail donnée à votre mairie lors de l'inscription.")
                        .font(.subheadline).foregroundStyle(t.ink2).fixedSize(horizontal: false, vertical: true)
                }
            }
            PrimaryButton(title: "Se connecter", icon: "person.fill", trailingIcon: "chevron.right", action: action)
                .padding(.top, 4)
        }
    }
}

/// Habitant connecté mais inscrit dans aucune loterie.
struct NoLotteryView: View {
    @Environment(\.theme) private var t
    let email: String
    let onRefresh: () -> Void
    let onBrowse: () -> Void
    let browsing: Bool

    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 14) {
                ZStack {
                    Circle().fill(t.primary.opacity(0.08)).frame(width: 120, height: 120)
                    Image(systemName: "ticket").font(.system(size: 50, weight: .light)).foregroundStyle(t.primary)
                        .rotationEffect(.degrees(-12))
                    Image(systemName: "questionmark.circle.fill").font(.system(size: 30)).foregroundStyle(t.festive)
                        .background(Circle().fill(t.surface).padding(2))
                        .offset(x: 36, y: 30)
                }
                .accessibilityHidden(true)
                Text("Aucune loterie pour le moment").font(t.title(.title2)).multilineTextAlignment(.center)
                Text("Votre adresse \(email) n'est inscrite dans aucune ville. C'est la mairie qui inscrit ses habitants : dès qu'elle l'aura fait, votre loterie apparaîtra ici.")
                    .font(.subheadline).foregroundStyle(t.ink2).multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 10) {
                Tip(icon: "envelope", text: "Vérifiez que c'est bien l'adresse donnée à votre mairie.")
                Tip(icon: "building.columns", text: "Pas encore inscrit ? Demandez à l'accueil de votre mairie.")
            }
            .padding(14)
            .background(t.surface2, in: RoundedRectangle(cornerRadius: t.radius))

            PrimaryButton(title: "Actualiser", icon: "arrow.clockwise", trailingIcon: nil, action: onRefresh)
            Button(action: onBrowse) {
                Text(browsing ? "Masquer les villes" : "Découvrir les villes participantes")
                    .font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44)
            }
            .foregroundStyle(t.primary)
        }
    }
}

struct Tip: View {
    @Environment(\.theme) private var t
    let icon: String, text: String
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(t.primary).frame(width: 20).accessibilityHidden(true)
            Text(text).font(.footnote).foregroundStyle(t.ink).fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Un des trois engagements de BlockLucky, sous le titre.
struct Promise: View {
    @Environment(\.theme) private var t
    let icon: String, text: String
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.title3.weight(.semibold)).foregroundStyle(t.primary)
                .frame(width: 40, height: 40)
                .background(t.primary.opacity(0.1), in: Circle())
                .accessibilityHidden(true)
            Text(text).font(.caption.weight(.semibold)).foregroundStyle(t.ink).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(t.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(t.line))
    }
}

/// Carte d'une ville, à ses couleurs, avec l'état de sa loterie lu sur la blockchain.
struct CityCard: View {
    let city: City
    @State private var lottery: Chain.Lottery?

    var body: some View {
        let t = Theme.of(city)
        VStack(spacing: 0) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Loterie de").font(.caption.weight(.semibold)).opacity(0.8)
                    Text(city.name).font(t.title(.title2)).lineLimit(1)
                }
                Spacer()
                if let lottery {
                    StatusPill(text: lottery.statusText, live: lottery.isSelling,
                               foreground: t.onPrimary, background: .black.opacity(0.18))
                }
            }
            .foregroundStyle(t.onPrimary)
            .padding(16)
            .frame(maxWidth: .infinity)
            .background(
                ZStack(alignment: .trailing) {
                    LinearGradient(colors: [t.primary, t.primary.opacity(0.82)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    Image(systemName: "ticket.fill").font(.system(size: 90)).foregroundStyle(t.onPrimary.opacity(0.08))
                        .rotationEffect(.degrees(-18)).offset(x: 20)
                }
            )

            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cagnotte").font(.caption).foregroundStyle(t.ink2)
                    Text(lottery.map { Chain.eth($0.pot) } ?? "—").font(t.title(.title3)).foregroundStyle(t.ink)
                        .contentTransition(.numericText())
                }
                Divider().frame(height: 32).overlay(t.line)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Participants").font(.caption).foregroundStyle(t.ink2)
                    Text(lottery.map { "\($0.participants) / \($0.maxParticipants)" } ?? "—")
                        .font(.title3.weight(.bold).monospacedDigit()).foregroundStyle(t.ink)
                }
                Spacer()
                Swatches(theme: t)
                Image(systemName: "chevron.right").font(.subheadline.weight(.bold)).foregroundStyle(t.ink2)
                    .accessibilityHidden(true)
            }
            .padding(16)
            .background(t.surface)
        }
        .clipShape(RoundedRectangle(cornerRadius: t.radius + 6, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: t.radius + 6, style: .continuous).stroke(t.line))
        .shadow(color: .black.opacity(0.07), radius: 12, y: 6)
        .accessibilityElement(children: .combine)
        .task {
            guard let address = city.address, let l = try? await Chain.read(address) else { return }
            withAnimation { lottery = l }
        }
    }

    static var placeholder: some View {
        RoundedRectangle(cornerRadius: 16).fill(Theme.sobre.surface)
            .frame(height: 150)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.sobre.line))
            .overlay(ProgressView())
            .accessibilityLabel("Chargement")
    }
}

extension Chain.Lottery {
    var isSelling: Bool { state == 1 && !canDraw && endTime > Date() }
    var statusText: String {
        switch state {
        case 1: isSelling ? "Vente ouverte" : "Vente terminée"
        case 2: "Tirage en cours"
        default: roundId == 0 ? "Bientôt" : "Terminée"
        }
    }
}

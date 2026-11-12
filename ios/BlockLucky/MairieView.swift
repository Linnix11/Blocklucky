import SwiftUI
import UniformTypeIdentifiers

// MARK: - Mon compte (habitant connecté)

struct AccountView: View {
    @Binding var me: Me?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                if let me {
                    Section {
                        HStack(spacing: 14) {
                            Image(systemName: "person.crop.circle.fill").font(.system(size: 44)).foregroundStyle(Color.accentColor)
                                .accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(me.email).font(.headline)
                                Text("Habitant").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    } footer: {
                        Text("Votre mairie vous inscrit avec cette adresse : ce sont ses loteries qui s'affichent à l'accueil.")
                    }
                }
                LogoutButton(me: $me)
            }
            .navigationTitle("Mon compte")
            .toolbar { Button("Fermer") { dismiss() } }
        }
    }
}

struct LogoutButton: View {
    @Binding var me: Me?
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button(role: .destructive) {
            Task { await API.logout(); me = nil; dismiss() }
        } label: {
            Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
        }
    }
}

/// Message après une action (succès, attente ou erreur).
struct StatusMessage: Equatable {
    enum Kind { case info, ok, error }
    var kind: Kind
    var text: String

    var view: some View {
        Label(text, systemImage: kind == .ok ? "checkmark.circle.fill" : kind == .error ? "exclamationmark.triangle.fill" : "hourglass")
            .font(.subheadline)
            .foregroundStyle(kind == .ok ? Color.green : kind == .error ? Color.red : Color.secondary)
    }
}

// MARK: - Espace mairie

struct MairieView: View {
    @Binding var me: Me?
    @State private var data: API.MairieData?
    @State private var lottery: Chain.Lottery?
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if let error { Section { StatusMessage(kind: .error, text: error).view } }
                if let city = data?.city {
                    Section { MairieHeader(city: city, lottery: lottery) }
                        .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)

                    Section("Loterie") {
                        LotteryControls(lottery: lottery) { await reload() }
                    }

                    Section("Gestion") {
                        NavigationLink {
                            ParticipantsView(list: data?.participants ?? []) { await reload() }
                        } label: {
                            MenuRow(icon: "person.3.fill", color: .blue, title: "Habitants inscrits",
                                    detail: "\(data?.participants.count ?? 0)")
                        }
                        NavigationLink {
                            DesignView(city: city) { await reload() }
                        } label: {
                            MenuRow(icon: "paintpalette.fill", color: .purple, title: "Design de la page", detail: themeName(city))
                        }
                        NavigationLink {
                            LotteryView(city: city)
                        } label: {
                            MenuRow(icon: "eye.fill", color: .teal, title: "Voir la page publique", detail: nil)
                        }
                    }
                    Section { LogoutButton(me: $me) } footer: { Text("Connecté en tant que \(me?.email ?? "")") }
                } else if error == nil {
                    Section { HStack { Spacer(); ProgressView(); Spacer() } }
                }
            }
            .navigationTitle("Espace mairie")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { dismiss() } }
            .refreshable { await reload() }
            .task { await reload() }
        }
    }

    func themeName(_ city: City) -> String {
        city.theme == "custom" ? (city.customTheme?.name ?? "Personnalisé") : Theme.names.first { $0.id == city.theme }?.name ?? "Sobre"
    }

    func reload() async {
        do {
            let d = try await API.mairie()
            data = d
            if let address = d.city.address { lottery = try? await Chain.read(address) }
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct MenuRow: View {
    let icon: String
    let color: Color
    let title: String
    let detail: String?
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                .frame(width: 30, height: 30).background(color, in: RoundedRectangle(cornerRadius: 7))
                .accessibilityHidden(true)
            Text(title)
            Spacer()
            if let detail { Text(detail).foregroundStyle(.secondary).lineLimit(1) }
        }
        .padding(.vertical, 2)
    }
}

/// En-tête de l'espace mairie : la ville, aux couleurs de son design, et l'état de sa loterie.
struct MairieHeader: View {
    let city: City
    let lottery: Chain.Lottery?
    var body: some View {
        let t = Theme.of(city)
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Mairie de").font(.caption.weight(.bold)).textCase(.uppercase).opacity(0.85)
                Spacer()
                if let lottery {
                    StatusPill(text: lottery.statusText, live: lottery.isSelling, foreground: t.onPrimary, background: .black.opacity(0.18))
                }
            }
            Text(city.name).font(t.title(.largeTitle)).lineLimit(1).minimumScaleFactor(0.6)
            if let l = lottery {
                HStack(spacing: 0) {
                    HeaderStat(label: "Cagnotte", value: Chain.eth(l.pot))
                    HeaderStat(label: "Participants", value: "\(l.participants)/\(l.maxParticipants)")
                    HeaderStat(label: "Tickets", value: "\(l.ticketsSold)")
                }
            }
        }
        .foregroundStyle(t.onPrimary)
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [t.primary, t.primary.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

struct HeaderStat: View {
    let label: String, value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption).opacity(0.8)
            Text(value).font(.headline.monospacedDigit()).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

// MARK: Pilotage de la loterie (transactions signées par le serveur)

struct LotteryControls: View {
    let lottery: Chain.Lottery?
    let onChange: () async -> Void
    @State private var showOpen = false
    @State private var busy = false
    @State private var status: StatusMessage?
    @State private var confirmDraw = false

    var body: some View {
        Group {
            if let l = lottery {
                switch l.state {
                case 0:
                    Text(l.roundId == 0 ? "Aucune loterie n'a encore été ouverte." : "La loterie n°\(l.roundId) est terminée : vous pouvez en ouvrir une nouvelle.")
                        .font(.subheadline).foregroundStyle(.secondary)
                    ActionButton(title: "Ouvrir une loterie", icon: "play.fill", busy: busy) { showOpen = true }
                case 1 where l.canDraw:
                    Text(l.ticketsSold == 0 ? "La vente est terminée sans aucun ticket : clôturez la loterie (pas de gagnant)."
                                            : "La vente est terminée : lancez le tirage. Chainlink choisit le gagnant.")
                        .font(.subheadline).foregroundStyle(.secondary)
                    ActionButton(title: l.ticketsSold == 0 ? "Clôturer la loterie" : "Lancer le tirage", icon: "sparkles", busy: busy) {
                        confirmDraw = true
                    }
                case 1:
                    LabeledContent("Fin de la vente", value: l.endTime.formatted(LotteryView.dateFormat))
                    Text("Le tirage sera possible quand le nombre de participants sera atteint ou à la fin de la vente.")
                        .font(.footnote).foregroundStyle(.secondary)
                default:
                    HStack(spacing: 10) {
                        ProgressView()
                        Text("Tirage en cours : Chainlink calcule le gagnant (une à trois minutes).").font(.subheadline)
                    }
                    if Date() >= l.retryAt {
                        ActionButton(title: "Relancer le tirage", icon: "arrow.clockwise", busy: busy) { run("Relance du tirage", "retry") }
                    } else {
                        Text("Sans réponse, la relance sera possible à \(l.retryAt.formatted(date: .omitted, time: .shortened)).")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
            } else {
                ProgressView()
            }
            if let status { status.view }
        }
        .sheet(isPresented: $showOpen) {
            OpenRoundView { params in run("Ouverture de la loterie", "round", body: params) }
        }
        .confirmationDialog("Lancer le tirage ?", isPresented: $confirmDraw, titleVisibility: .visible) {
            Button("Lancer maintenant") { run("Tirage", "draw") }
        } message: {
            Text("Le serveur envoie la demande à Chainlink. Personne, pas même la mairie, ne peut choisir le gagnant.")
        }
        .sensoryFeedback(.success, trigger: status?.kind == .ok)
    }

    func run(_ label: String, _ action: String, body: [String: Any]? = nil) {
        Task {
            busy = true
            status = StatusMessage(kind: .info, text: "\(label) : transaction en cours (environ 15 s)…")
            defer { busy = false }
            do {
                try await API.mairieAction(action, body: body)
                status = StatusMessage(kind: .ok, text: "\(label) : fait.")
                await onChange()
            } catch {
                status = StatusMessage(kind: .error, text: "\(label) : \(error.localizedDescription)")
            }
        }
    }
}

struct ActionButton: View {
    let title: String, icon: String
    var busy = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack {
                if busy { ProgressView() } else { Image(systemName: icon) }
                Text(title).fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .disabled(busy)
    }
}

/// Réglages d'une nouvelle loterie (valeurs de démo par défaut, comme sur le site).
struct OpenRoundView: View {
    let onOpen: ([String: Any]) -> Void
    @State private var price = 0.001
    @State private var maxParticipants = 5
    @State private var maxTickets = 5
    @State private var minutes = 10
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("Prix du ticket") {
                        TextField("0,001", value: $price, format: .number.precision(.fractionLength(0...6)))
                            .keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                        Text("ETH").foregroundStyle(.secondary)
                    }
                    Stepper("Participants max : \(maxParticipants)", value: $maxParticipants, in: 1...10_000)
                    Stepper("Tickets par personne : \(maxTickets)", value: $maxTickets, in: 1...100)
                } footer: {
                    Text("Le tirage devient possible dès que le nombre de participants est atteint ou à la fin de la durée.")
                }
                Section("Durée de la vente") {
                    Picker("Durée", selection: $minutes) {
                        Text("10 minutes (démo)").tag(10)
                        Text("1 heure").tag(60)
                        Text("1 jour").tag(1440)
                        Text("1 semaine").tag(10_080)
                        Text("30 jours").tag(43_200)
                    }
                    .pickerStyle(.inline).labelsHidden()
                }
            }
            .navigationTitle("Nouvelle loterie")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ouvrir") {
                        onOpen(["priceEth": price, "maxParticipants": maxParticipants,
                                "maxTicketsPerWallet": maxTickets, "durationMinutes": minutes])
                        dismiss()
                    }
                    .disabled(price <= 0)
                }
            }
        }
    }
}

// MARK: Habitants inscrits

struct ParticipantsView: View {
    @State var list: [String]
    let onChange: () async -> Void
    @State private var search = ""
    @State private var newEntry = ""
    @State private var status: StatusMessage?
    @State private var importing = false
    @State private var replaceOnImport = false
    @State private var busy = false

    var filtered: [String] { search.isEmpty ? list : list.filter { $0.localizedCaseInsensitiveContains(search) } }

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("mail ou adresse 0x…", text: $newEntry)
                        .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .onSubmit(add)
                    Button("Ajouter", action: add).disabled(newEntry.trimmingCharacters(in: .whitespaces).isEmpty || busy)
                }
                Button { importing = true } label: { Label("Importer un fichier CSV", systemImage: "doc.badge.plus") }
                Toggle("Remplacer toute la liste à l'import", isOn: $replaceOnImport)
                if let status { status.view }
            } header: {
                Text("Inscrire")
            } footer: {
                Text("Inscrit par son mail, l'habitant se connecte à l'app ; inscrit par son adresse 0x, il joue avec MetaMask.")
            }

            Section("\(list.count) inscrit\(list.count > 1 ? "s" : "")") {
                if list.isEmpty {
                    ContentUnavailableView("Aucun habitant inscrit", systemImage: "person.crop.circle.badge.plus",
                                           description: Text("Ajoutez des mails ou importez la liste de la mairie."))
                }
                ForEach(filtered, id: \.self) { id in
                    Label(id, systemImage: id.hasPrefix("0x") ? "wallet.bifold" : "envelope")
                        .font(id.hasPrefix("0x") ? .footnote.monospaced() : .body)
                        .lineLimit(1).truncationMode(.middle)
                }
                .onDelete { offsets in remove(offsets.map { filtered[$0] }) }
            }
        }
        .searchable(text: $search, prompt: "Rechercher un habitant")
        .navigationTitle("Habitants")
        .fileImporter(isPresented: $importing, allowedContentTypes: [.commaSeparatedText, .plainText, .text]) { result in
            guard case .success(let url) = result else { return }
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            guard let text = try? String(contentsOf: url, encoding: .utf8) else {
                status = StatusMessage(kind: .error, text: "Fichier illisible.")
                return
            }
            send(text, replace: replaceOnImport)
        }
        .refreshable { await refresh() }
    }

    func add() { send(newEntry, replace: false); newEntry = "" }

    func send(_ text: String, replace: Bool) {
        Task {
            busy = true
            defer { busy = false }
            do {
                let n = try await API.addParticipants(text, replace: replace)
                status = StatusMessage(kind: .ok, text: "\(n) inscription\(n > 1 ? "s" : "") ajoutée\(n > 1 ? "s" : "").")
                await refresh()
            } catch { status = StatusMessage(kind: .error, text: error.localizedDescription) }
        }
    }

    func remove(_ ids: [String]) {
        Task {
            for id in ids { try? await API.removeParticipant(id) }
            await refresh()
        }
    }

    func refresh() async {
        if let d = try? await API.mairie() { list = d.participants }
        await onChange()
    }
}

// MARK: Design de la page publique (catalogue, personnalisé, Gemini)

struct DesignView: View {
    let city: City
    let onChange: () async -> Void
    @State private var selected = "sobre"
    @State private var colors = [Color.hex("#f4f6f9"), .hex("#ffffff"), .hex("#14213d"), .hex("#1f4e8c"), .hex("#a3242f")]
    @State private var corners = "standard"
    @State private var serif = false
    @State private var coloredHeader = false
    @State private var customName = "Design personnalisé"
    @State private var prompt = ""
    @State private var generating = false
    @State private var status: StatusMessage?
    @State private var busy = false

    private let colorLabels = ["Fond", "Cartes", "Texte", "Couleur d'action", "Couleur d'accent"]

    /// Le design personnalisé tel qu'il sera envoyé (le serveur le valide et corrige les contrastes).
    var custom: CustomTheme {
        let h = colors.map(\.hexString)
        return CustomTheme(name: customName, description: nil,
                           colors: .init(bg: h[0], surface: h[1], ink: h[2], primary: h[3], festive: h[4]),
                           font: serif ? "Source Serif 4" : "Public Sans", corners: corners,
                           header: coloredHeader ? "couleur" : "clair")
    }

    var preview: Theme { selected == "custom" ? Theme(custom: custom) : Theme.catalog[selected] ?? .sobre }

    var body: some View {
        Form {
            Section("Aperçu") { ThemePreview(name: city.name).environment(\.theme, preview) }
                .listRowInsets(EdgeInsets())

            Section("Choisir un design") {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(Theme.names, id: \.id) { item in
                        ThemeChoice(name: item.name, theme: Theme.catalog[item.id]!, selected: selected == item.id) { selected = item.id }
                    }
                    ThemeChoice(name: "Personnalisé", theme: Theme(custom: custom), selected: selected == "custom", icon: "paintpalette.fill") {
                        selected = "custom"
                    }
                }
                .padding(.vertical, 4)
                .sensoryFeedback(.selection, trigger: selected)
            }

            Section {
                ZStack(alignment: .topLeading) {
                    if prompt.isEmpty {
                        Text("Par exemple : bleu marine et or, élégant, pour une ville d'art et d'histoire au bord de la Loire.")
                            .foregroundStyle(.tertiary).padding(.top, 8).padding(.leading, 4)
                            .accessibilityHidden(true)
                    }
                    TextEditor(text: $prompt).frame(minHeight: 90).scrollContentBackground(.hidden)
                        .accessibilityLabel("Description du style souhaité")
                }
                Button(action: generate) {
                    HStack {
                        if generating { ProgressView() } else { Image(systemName: "sparkles") }
                        Text(generating ? "Gemini réfléchit…" : "Générer une proposition").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity, minHeight: 40)
                }
                .buttonStyle(.bordered)
                .disabled(generating || prompt.trimmingCharacters(in: .whitespacesAndNewlines).count < 10)
            } header: {
                Label("Créer avec Gemini", systemImage: "wand.and.stars")
            } footer: {
                Text("Décrivez le style voulu. Gemini propose des couleurs, une police et un style ; le serveur garantit un texte lisible. Rien n'est enregistré avant de valider. N'indiquez pas de données personnelles. \(prompt.count)/600")
            }

            if selected == "custom" {
                Section("Couleurs") {
                    ForEach(colorLabels.indices, id: \.self) { i in
                        ColorPicker(colorLabels[i], selection: $colors[i], supportsOpacity: false)
                    }
                }
                Section("Style") {
                    Picker("Angles", selection: $corners) {
                        Text("Nets").tag("net"); Text("Standard").tag("standard"); Text("Arrondis").tag("arrondi")
                    }
                    Toggle("Titres à empattements", isOn: $serif)
                    Toggle("En-tête en couleur", isOn: $coloredHeader)
                }
            }

            Section {
                if let status { status.view }
                Button(action: save) {
                    HStack { if busy { ProgressView() }; Text("Enregistrer ce design").fontWeight(.semibold) }
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .disabled(busy)
            } footer: {
                Text("Le design s'affiche aussitôt sur le site et dans l'app.")
            }
        }
        .navigationTitle("Design")
        .onAppear(perform: load)
    }

    func load() {
        selected = city.theme
        if let t = city.customTheme { apply(t) }
    }

    func apply(_ t: CustomTheme) {
        colors = [t.colors.bg, t.colors.surface, t.colors.ink, t.colors.primary, t.colors.festive].map(Color.hex)
        (corners, serif, coloredHeader, customName) = (t.corners, t.font != "Public Sans", t.header == "couleur", t.name)
    }

    func generate() {
        Task {
            generating = true
            status = nil
            defer { generating = false }
            do {
                let proposal = try await API.generateTheme(String(prompt.prefix(600)))
                withAnimation { apply(proposal); selected = "custom" }
                status = StatusMessage(kind: .ok, text: "Proposition « \(proposal.name) » : regardez l'aperçu, puis enregistrez si elle vous plaît.")
            } catch { status = StatusMessage(kind: .error, text: error.localizedDescription) }
        }
    }

    func save() {
        Task {
            busy = true
            defer { busy = false }
            do {
                try await API.saveTheme(selected, custom: selected == "custom" ? custom : nil)
                status = StatusMessage(kind: .ok, text: "Design enregistré : il s'affiche maintenant sur le site et dans l'app.")
                await onChange()
            } catch { status = StatusMessage(kind: .error, text: error.localizedDescription) }
        }
    }
}

/// Mini page de loterie, pour voir le design avant de l'enregistrer.
struct ThemePreview: View {
    @Environment(\.theme) private var t
    let name: String
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(name).font(.headline).padding(12).frame(maxWidth: .infinity, alignment: .leading)
                .foregroundStyle(t.coloredHeader ? t.onPrimary : t.ink)
                .background(t.coloredHeader ? t.primary : t.surface)
            VStack(alignment: .leading, spacing: 10) {
                Text("VENTE OUVERTE").font(.caption.weight(.bold)).foregroundStyle(t.festive)
                Text("La loterie des fêtes").font(t.title(.title3)).foregroundStyle(t.ink)
                Card {
                    Text("Cagnotte").font(.caption).foregroundStyle(t.ink2)
                    Text("0,005 ETH").font(t.title(.title2)).foregroundStyle(t.primary)
                }
                PrimaryButton(title: "Acheter des tickets", icon: "ticket.fill") {}.allowsHitTesting(false)
            }
            .padding(12)
        }
        .background(t.bg)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Aperçu du design")
    }
}

/// Carte de choix d'un design : ses couleurs, son nom, et une coche quand il est choisi.
struct ThemeChoice: View {
    let name: String
    let theme: Theme
    let selected: Bool
    var icon: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .bottomLeading) {
                    theme.bg
                    VStack(alignment: .leading, spacing: 4) {
                        Capsule().fill(theme.primary).frame(width: 46, height: 8)
                        Capsule().fill(theme.festive).frame(width: 26, height: 6)
                    }
                    .padding(10)
                    if let icon {
                        Image(systemName: icon).foregroundStyle(theme.primary).padding(10)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    }
                }
                .frame(height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(.black.opacity(0.08)))
                HStack {
                    Text(name).font(.subheadline.weight(.semibold)).foregroundStyle(.primary).lineLimit(1).minimumScaleFactor(0.8)
                    Spacer(minLength: 0)
                    Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(selected ? Color.accentColor : .secondary)
                }
            }
            .padding(8)
            .background(RoundedRectangle(cornerRadius: 14).fill(Color(.secondarySystemGroupedBackground)))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(selected ? Color.accentColor : .clear, lineWidth: 2))
        }
        .buttonStyle(PressableStyle())
        .accessibilityLabel(name)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

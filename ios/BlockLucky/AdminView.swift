import SwiftUI

// MARK: - Espace admin : les mairies et leurs loteries

struct AdminView: View {
    @Binding var me: Me?
    @State private var cities: [API.AdminCity]?
    @State private var error: String?
    @State private var search = ""
    @State private var showCreate = false
    @State private var toDelete: API.AdminCity?
    @State private var status: StatusMessage?
    @Environment(\.dismiss) private var dismiss

    var filtered: [API.AdminCity] {
        guard let cities else { return [] }
        return search.isEmpty ? cities : cities.filter {
            $0.name.localizedCaseInsensitiveContains(search) || ($0.mairieEmail ?? "").localizedCaseInsensitiveContains(search)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if let cities {
                    Section { AdminSummary(cities: cities) }
                        .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                }
                if let error { Section { StatusMessage(kind: .error, text: error).view } }
                if let status { Section { status.view } }

                Section {
                    if cities == nil, error == nil { HStack { Spacer(); ProgressView(); Spacer() } }
                    if cities?.isEmpty == true {
                        ContentUnavailableView("Aucune mairie", systemImage: "building.columns",
                                               description: Text("Créez la première mairie avec le bouton +."))
                    }
                    ForEach(filtered) { city in
                        NavigationLink { AdminCityView(city: city) } label: { AdminCityRow(city: city) }
                            .swipeActions {
                                Button("Supprimer", role: .destructive) { toDelete = city }
                            }
                    }
                } header: {
                    Text("Mairies")
                } footer: {
                    Text("Balayez vers la gauche pour supprimer une mairie.")
                }

                Section { LogoutButton(me: $me) } footer: { Text("Administrateur : \(me?.email ?? "")") }
                AppVersionSection()
            }
            .searchable(text: $search, prompt: "Rechercher une ville ou un mail")
            .navigationTitle("Administration")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Fermer") { dismiss() } }
                ToolbarItem(placement: .primaryAction) {
                    Button { showCreate = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("Créer une mairie")
                }
            }
            .sheet(isPresented: $showCreate) {
                CreateCityView { created in
                    status = StatusMessage(kind: .ok, text: "Mairie créée, loterie à l'adresse \(Chain.short(created.address)).")
                    Task { await load() }
                }
            }
            .confirmationDialog("Supprimer \(toDelete?.name ?? "") ?", isPresented: Binding(get: { toDelete != nil }, set: { if !$0 { toDelete = nil } }),
                                titleVisibility: .visible, presenting: toDelete) { city in
                Button("Supprimer la mairie", role: .destructive) { delete(city) }
            } message: { _ in
                Text("Le compte de la mairie et sa liste d'habitants sont supprimés. Le contrat reste sur la blockchain : son historique reste public.")
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    func load() async {
        do {
            cities = try await API.adminCities()
            error = nil
        } catch { self.error = error.localizedDescription }
    }

    func delete(_ city: API.AdminCity) {
        Task {
            do {
                try await API.deleteCity(city.id)
                status = StatusMessage(kind: .ok, text: "\(city.name) supprimée.")
                await load()
            } catch { status = StatusMessage(kind: .error, text: error.localizedDescription) }
        }
    }
}

/// Chiffres d'ensemble de la plateforme.
struct AdminSummary: View {
    let cities: [API.AdminCity]
    var body: some View {
        HStack(spacing: 12) {
            tile("\(cities.count)", "Mairies", "building.columns.fill", .blue)
            tile("\(cities.reduce(0) { $0 + $1.participants })", "Habitants inscrits", "person.3.fill", .green)
        }
    }

    func tile(_ value: String, _ label: String, _ icon: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon).foregroundStyle(color).font(.title3).accessibilityHidden(true)
            Text(value).font(.title.weight(.bold).monospacedDigit())
            Text(label).font(.footnote).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }
}

struct AdminCityRow: View {
    let city: API.AdminCity
    var body: some View {
        let t = Theme.catalog[city.theme] ?? .sobre
        HStack(spacing: 12) {
            Text(city.name.prefix(1).uppercased()).font(.headline).foregroundStyle(t.onPrimary)
                .frame(width: 40, height: 40).background(t.primary, in: RoundedRectangle(cornerRadius: 10))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(city.name).font(.body.weight(.semibold))
                Text(city.mairieEmail ?? "Pas de compte mairie").font(.footnote).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer()
            Label("\(city.participants)", systemImage: "person.fill").font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

/// Fiche d'une mairie : compte, contrat et état de sa loterie.
struct AdminCityView: View {
    let city: API.AdminCity
    @State private var lottery: Chain.Lottery?
    @State private var copied = false

    var body: some View {
        List {
            Section("Mairie") {
                LabeledContent("Ville", value: city.name)
                LabeledContent("Compte", value: city.mairieEmail ?? "—")
                LabeledContent("Habitants inscrits", value: "\(city.participants)")
                LabeledContent("Design", value: city.theme == "custom" ? "Personnalisé" : Theme.names.first { $0.id == city.theme }?.name ?? city.theme)
            }
            if let address = city.address {
                Section("Contrat") {
                    Button {
                        UIPasteboard.general.string = address
                        copied.toggle()
                    } label: {
                        LabeledContent("Adresse") {
                            HStack { Text(Chain.short(address)).monospaced(); Image(systemName: "doc.on.doc") }
                        }
                    }
                    .foregroundStyle(.primary)
                    if let url = URL(string: Chain.explorer + address) {
                        Link(destination: url) { Label("Voir sur Etherscan", systemImage: "arrow.up.right.square") }
                    }
                }
                Section("Loterie en cours") {
                    if let l = lottery {
                        LabeledContent("État", value: l.statusText)
                        LabeledContent("Loterie n°", value: "\(l.roundId)")
                        LabeledContent("Cagnotte", value: Chain.eth(l.pot))
                        LabeledContent("Participants", value: "\(l.participants) / \(l.maxParticipants)")
                        LabeledContent("Tickets vendus", value: "\(l.ticketsSold)")
                    } else {
                        ProgressView()
                    }
                }
            }
        }
        .navigationTitle(city.name)
        .sensoryFeedback(.success, trigger: copied)
        .task { if let address = city.address { lottery = try? await Chain.read(address) } }
    }
}

/// Création d'une mairie : son compte et sa loterie (déployée par le serveur si aucun contrat n'est donné).
struct CreateCityView: View {
    let onCreated: (API.Created) -> Void
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var theme = "sobre"
    @State private var contract = ""
    @State private var busy = false
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    var valid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
            && email.wholeMatch(of: /[^\s@]+@[^\s@]+\.[^\s@]+/) != nil
            && password.count >= 6
            && (contract.isEmpty || contract.wholeMatch(of: /0x[0-9a-fA-F]{40}/) != nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Ville") {
                    TextField("Nom de la ville", text: $name).textInputAutocapitalization(.words)
                    Picker("Design", selection: $theme) {
                        ForEach(Theme.names, id: \.id) { Text($0.name).tag($0.id) }
                    }
                }
                Section {
                    TextField("Mail de la mairie", text: $email)
                        .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .textContentType(.emailAddress)
                    SecureField("Mot de passe (6 caractères min.)", text: $password).textContentType(.newPassword)
                } header: {
                    Text("Compte de la mairie")
                } footer: {
                    Text("Transmettez ces identifiants à la mairie : elle pourra ensuite ouvrir ses loteries et inscrire ses habitants.")
                }
                Section {
                    TextField("0x… (facultatif)", text: $contract)
                        .font(.body.monospaced()).textInputAutocapitalization(.never).autocorrectionDisabled()
                } header: {
                    Text("Contrat existant")
                } footer: {
                    Text("Laissez vide pour que le serveur déploie une nouvelle loterie sur Sepolia (une à deux minutes, payée avec les ETH de test du serveur).")
                }
                if let error { Section { StatusMessage(kind: .error, text: error).view } }
                if busy {
                    Section {
                        HStack(spacing: 12) {
                            ProgressView()
                            Text(contract.isEmpty ? "Déploiement de la loterie sur Sepolia…" : "Création de la mairie…")
                        }
                    }
                }
            }
            .navigationTitle("Nouvelle mairie")
            .navigationBarTitleDisplayMode(.inline)
            .interactiveDismissDisabled(busy)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() }.disabled(busy) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Créer", action: create).disabled(!valid || busy)
                }
            }
        }
    }

    func create() {
        Task {
            busy = true
            error = nil
            defer { busy = false }
            do {
                let created = try await API.createCity(name: name.trimmingCharacters(in: .whitespaces),
                                                       email: email.trimmingCharacters(in: .whitespaces).lowercased(),
                                                       password: password, theme: theme, contract: contract)
                onCreated(created)
                dismiss()
            } catch { self.error = error.localizedDescription }
        }
    }
}

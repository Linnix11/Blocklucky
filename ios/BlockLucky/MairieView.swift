import SwiftUI

// MARK: - Mon compte (habitant ou admin connecté)

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
                                Text(me.role == "admin" ? "Administrateur" : "Habitant").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    } footer: {
                        Text("Votre mairie vous inscrit avec cette adresse : ce sont ses loteries qui s'affichent à l'accueil.")
                    }
                }
                Button("Se déconnecter", role: .destructive) {
                    Task { await API.logout(); me = nil; dismiss() }
                }
            }
            .navigationTitle("Mon compte")
            .toolbar { Button("Fermer") { dismiss() } }
        }
    }
}

// MARK: - Espace mairie : choix du design de la page de la ville

struct MairieView: View {
    @Binding var me: Me?
    @State private var city: City?
    @State private var selected = "sobre"
    @State private var colors = [Color.hex("#f4f6f9"), .hex("#ffffff"), .hex("#14213d"), .hex("#1f4e8c"), .hex("#a3242f")]
    @State private var corners = "standard"
    @State private var serif = false
    @State private var coloredHeader = false
    @State private var message: String?
    @State private var busy = false
    @Environment(\.dismiss) private var dismiss

    private let colorLabels = ["Fond", "Cartes", "Texte", "Couleur d'action", "Couleur d'accent"]

    /// Le design personnalisé tel qu'il sera envoyé (le serveur le valide et corrige les contrastes).
    var custom: CustomTheme {
        let h = colors.map(\.hexString)
        return CustomTheme(name: "Design personnalisé", description: nil,
                           colors: .init(bg: h[0], surface: h[1], ink: h[2], primary: h[3], festive: h[4]),
                           font: serif ? "Source Serif 4" : "Public Sans", corners: corners,
                           header: coloredHeader ? "couleur" : "clair")
    }

    var preview: Theme { selected == "custom" ? Theme(custom: custom) : Theme.catalog[selected] ?? .sobre }

    var body: some View {
        NavigationStack {
            Form {
                Section("Design de la page de \(city?.name ?? "la ville")") {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                        ForEach(Theme.names, id: \.id) { item in
                            ThemeChoice(name: item.name, theme: Theme.catalog[item.id]!, selected: selected == item.id) {
                                selected = item.id
                            }
                        }
                        ThemeChoice(name: "Personnalisé", theme: Theme(custom: custom), selected: selected == "custom", icon: "paintpalette.fill") {
                            selected = "custom"
                        }
                    }
                    .padding(.vertical, 4)
                    .sensoryFeedback(.selection, trigger: selected)
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
                Section("Aperçu") { ThemePreview(name: city?.name ?? "Votre ville").environment(\.theme, preview) }
                    .listRowInsets(EdgeInsets())
                if let message { Text(message) }
                Button {
                    Task { await save() }
                } label: {
                    if busy { ProgressView() } else { Text("Enregistrer le design") }
                }
                .disabled(busy || city == nil)
                Button("Se déconnecter", role: .destructive) {
                    Task { await API.logout(); me = nil; dismiss() }
                }
            }
            .navigationTitle("Espace mairie")
            .toolbar { Button("Fermer") { dismiss() } }
            .task { await load() }
        }
    }

    func load() async {
        do {
            let c = try await API.mairieCity()
            city = c
            selected = c.theme
            if let t = c.customTheme {
                colors = [t.colors.bg, t.colors.surface, t.colors.ink, t.colors.primary, t.colors.festive].map(Color.hex)
                (corners, serif, coloredHeader) = (t.corners, t.font != "Public Sans", t.header == "couleur")
            }
        } catch { message = error.localizedDescription }
    }

    func save() async {
        busy = true
        defer { busy = false }
        do {
            try await API.saveTheme(selected, custom: selected == "custom" ? custom : nil)
            message = "Design enregistré : il s'affiche maintenant sur le site et dans l'app."
        } catch { message = error.localizedDescription }
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
                Text("OUVERTE").font(.caption.weight(.bold)).foregroundStyle(t.festive)
                Text("La loterie des fêtes").font(t.title(.title3)).foregroundStyle(t.ink)
                Card {
                    Text("Cagnotte").font(.caption).foregroundStyle(t.ink2)
                    Text("0,005 ETH").font(t.title(.title2)).foregroundStyle(t.primary)
                }
                PrimaryButton(title: "Acheter des tickets") {}.allowsHitTesting(false)
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

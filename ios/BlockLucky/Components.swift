import SwiftUI

// Composants partagés, tous aux couleurs du design courant (`@Environment(\.theme)`).

struct Card<Content: View>: View {
    @Environment(\.theme) private var t
    var padding: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 10) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(padding)
            .background(t.surface, in: RoundedRectangle(cornerRadius: t.radius + 4))
            .overlay(RoundedRectangle(cornerRadius: t.radius + 4).stroke(t.line))
            .shadow(color: .black.opacity(t.dark ? 0.3 : 0.05), radius: 10, y: 4)
    }
}

/// Titre de section : icône + texte.
struct SectionTitle: View {
    @Environment(\.theme) private var t
    let title: String, icon: String
    var body: some View {
        Label(title, systemImage: icon)
            .font(t.title(.title3))
            .foregroundStyle(t.ink)
            .labelStyle(TintedIconLabel(tint: t.primary))
            .accessibilityAddTraits(.isHeader)
    }
}

struct TintedIconLabel: LabelStyle {
    let tint: Color
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.icon.foregroundStyle(tint).font(.body.weight(.semibold))
            configuration.title
        }
    }
}

/// Pastille d'état de la loterie, avec un point qui pulse quand la vente est ouverte.
struct StatusPill: View {
    let text: String
    let live: Bool
    var foreground: Color
    var background: Color
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(live ? Color.green : foreground.opacity(0.6))
                .frame(width: 8, height: 8)
                .overlay(Circle().stroke(Color.green.opacity(pulse ? 0 : 0.6), lineWidth: pulse ? 8 : 0))
                .accessibilityHidden(true)
            Text(text).font(.caption.weight(.bold)).textCase(.uppercase)
        }
        .foregroundStyle(foreground)
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(background, in: Capsule())
        .onAppear {
            guard live, !reduceMotion else { return }
            withAnimation(.easeOut(duration: 1.4).repeatForever(autoreverses: false)) { pulse = true }
        }
    }
}

/// Forme d'un ticket de tombola : deux encoches en demi-cercle sur les côtés, à `notchAt` de la hauteur.
struct TicketShape: Shape {
    var radius: CGFloat
    var notchAt: CGFloat = 0.68
    var notch: CGFloat = 14

    func path(in rect: CGRect) -> Path {
        let y = rect.minY + rect.height * notchAt
        let left = Path(ellipseIn: CGRect(x: rect.minX - notch, y: y - notch, width: notch * 2, height: notch * 2))
        let right = Path(ellipseIn: CGRect(x: rect.maxX - notch, y: y - notch, width: notch * 2, height: notch * 2))
        return RoundedRectangle(cornerRadius: radius).path(in: rect).subtracting(left).subtracting(right)
    }
}

/// Bouton principal, plein, à la couleur d'action du design.
struct PrimaryButton: View {
    @Environment(\.theme) private var t
    let title: String
    var subtitle: String?
    var icon: String?
    var trailingIcon: String? = "arrow.up.right"
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if let icon { Image(systemName: icon).font(.title3.weight(.semibold)).accessibilityHidden(true) }
                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(.headline)
                    if let subtitle { Text(subtitle).font(.caption).opacity(0.85) }
                }
                Spacer(minLength: 0)
                if let trailingIcon {
                    Image(systemName: trailingIcon).font(.subheadline.weight(.bold)).accessibilityHidden(true)
                }
            }
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity, minHeight: 56)
            .foregroundStyle(t.onPrimary)
            .background(t.primary, in: RoundedRectangle(cornerRadius: t.radius + 4))
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableStyle())
    }
}

/// Retour visuel au toucher, sans décaler la mise en page.
struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// Barre de progression arrondie.
struct ProgressBar: View {
    @Environment(\.theme) private var t
    let value: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(t.surface2)
                Capsule().fill(t.primary).frame(width: max(8, geo.size.width * value))
            }
        }
        .frame(height: 10)
        .animation(.spring(duration: 0.6), value: value)
        .accessibilityHidden(true)
    }
}

/// Les trois couleurs d'aperçu d'un design.
struct Swatches: View {
    let theme: Theme
    var size: CGFloat = 14
    var body: some View {
        HStack(spacing: -4) {
            ForEach(Array([theme.bg, theme.primary, theme.festive].enumerated()), id: \.offset) { _, color in
                Circle().fill(color).frame(width: size, height: size)
                    .overlay(Circle().stroke(.white.opacity(0.9), lineWidth: 1.5))
            }
        }
        .accessibilityHidden(true)
    }
}

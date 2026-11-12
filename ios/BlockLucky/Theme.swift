import SwiftUI

/// Design d'une ville : les mêmes 5 designs que le site (src/themes.css), plus le design personnalisé
/// de la mairie (src/lib/customTheme.js). Le serveur a déjà validé et corrigé les contrastes.
struct Theme {
    var bg, surface, surface2, line, ink, ink2, primary, onPrimary, festive: Color
    var radius: CGFloat = 10
    var serif = false          // titres à empattements (Fêtes, Patrimoine)
    var coloredHeader = false  // en-tête de la couleur d'action (Littoral)
    var dark = false

    static let catalog: [String: Theme] = [
        "sobre": Theme(bg: .hex("#f4f6f9"), surface: .hex("#ffffff"), surface2: .hex("#f0f3f7"), line: .hex("#d8dee6"),
                       ink: .hex("#14213d"), ink2: .hex("#4a5568"), primary: .hex("#1f4e8c"), onPrimary: .white,
                       festive: .hex("#a3242f")),
        "fetes": Theme(bg: .hex("#f6f3ec"), surface: .hex("#fffdf8"), surface2: .hex("#efeadf"), line: .hex("#ddd5c5"),
                       ink: .hex("#1f2a22"), ink2: .hex("#4c5a4f"), primary: .hex("#1d5c3f"), onPrimary: .white,
                       festive: .hex("#b3262e"), serif: true),
        "littoral": Theme(bg: .hex("#eef6f7"), surface: .hex("#ffffff"), surface2: .hex("#e4eff1"), line: .hex("#cfe0e3"),
                          ink: .hex("#0e2a33"), ink2: .hex("#3f5a61"), primary: .hex("#0b6b77"), onPrimary: .white,
                          festive: .hex("#9a5317"), radius: 14, coloredHeader: true),
        "patrimoine": Theme(bg: .hex("#f5f2ee"), surface: .hex("#fffefc"), surface2: .hex("#eee9e2"), line: .hex("#bfb3a3"),
                            ink: .hex("#2a1f1d"), ink2: .hex("#5a4c47"), primary: .hex("#7a1f2b"), onPrimary: .white,
                            festive: .hex("#7d5f26"), radius: 3, serif: true),
        "nuit": Theme(bg: .hex("#0f1626"), surface: .hex("#172036"), surface2: .hex("#1f2a44"), line: .hex("#2c3a58"),
                      ink: .hex("#e8edf6"), ink2: .hex("#b4bfd3"), primary: .hex("#8cb8ff"), onPrimary: .hex("#0f1626"),
                      festive: .hex("#f2b84b"), dark: true),
    ]

    static let names: [(id: String, name: String)] = [
        ("sobre", "Sobre"), ("fetes", "Fêtes de fin d'année"), ("littoral", "Littoral"), ("patrimoine", "Patrimoine"), ("nuit", "Nuit"),
    ]

    static let sobre = catalog["sobre"]!

    /// Design d'une ville, tel que renvoyé par /api/cities.
    static func of(_ city: City) -> Theme {
        if city.theme == "custom", let custom = city.customTheme { return Theme(custom: custom) }
        return catalog[city.theme] ?? sobre
    }

    /// Calcule toutes les couleurs à partir des 5 couleurs du design personnalisé (comme customThemeVars).
    init(custom: CustomTheme) {
        let c = custom.colors
        let dark = luminance(c.bg) < 0.18
        self.init(bg: .hex(c.bg), surface: .hex(c.surface), surface2: .hex(mix(c.surface, c.ink, 0.05)),
                  line: .hex(mix(c.surface, c.ink, 0.14)), ink: .hex(c.ink), ink2: .hex(mix(c.ink, c.surface, 0.25)),
                  primary: .hex(c.primary), onPrimary: luminance(c.primary) > 0.4 ? .hex(dark ? c.bg : "#111111") : .white,
                  festive: .hex(c.festive), radius: ["net": 3, "arrondi": 14][custom.corners] ?? 10,
                  serif: custom.font != "Public Sans", coloredHeader: custom.header == "couleur", dark: dark)
    }

    init(bg: Color, surface: Color, surface2: Color, line: Color, ink: Color, ink2: Color, primary: Color,
         onPrimary: Color, festive: Color, radius: CGFloat = 10, serif: Bool = false, coloredHeader: Bool = false, dark: Bool = false) {
        (self.bg, self.surface, self.surface2, self.line, self.ink, self.ink2) = (bg, surface, surface2, line, ink, ink2)
        (self.primary, self.onPrimary, self.festive) = (primary, onPrimary, festive)
        (self.radius, self.serif, self.coloredHeader, self.dark) = (radius, serif, coloredHeader, dark)
    }

    func title(_ style: Font.TextStyle) -> Font { .system(style, design: serif ? .serif : .default).weight(.bold) }
}

private struct ThemeKey: EnvironmentKey { static let defaultValue = Theme.sobre }
extension EnvironmentValues {
    var theme: Theme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

// MARK: - Couleurs hexadécimales

private func rgb(_ hex: String) -> [Double] {
    let v = Int(hex.dropFirst(), radix: 16) ?? 0
    return [Double((v >> 16) & 255), Double((v >> 8) & 255), Double(v & 255)]
}

/// Mélange a et b : t = 0 donne a, t = 1 donne b.
func mix(_ a: String, _ b: String, _ t: Double) -> String {
    let (x, y) = (rgb(a), rgb(b))
    return "#" + zip(x, y).map { String(format: "%02x", Int(($0 + ($1 - $0) * t).rounded())) }.joined()
}

/// Luminance relative WCAG.
func luminance(_ hex: String) -> Double {
    let l = rgb(hex).map { c -> Double in let v = c / 255; return v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}

extension Color {
    static func hex(_ hex: String) -> Color {
        let c = rgb(hex)
        return Color(red: c[0] / 255, green: c[1] / 255, blue: c[2] / 255)
    }

    /// Couleur → "#rrggbb" (pour renvoyer au serveur le choix du sélecteur de couleur).
    var hexString: String {
        let c = UIColor(self).cgColor.converted(to: CGColorSpace(name: CGColorSpace.sRGB)!, intent: .defaultIntent, options: nil)?.components ?? [0, 0, 0]
        return "#" + c.prefix(3).map { String(format: "%02x", Int(($0 * 255).rounded().clamped())) }.joined()
    }
}

private extension CGFloat {
    func clamped() -> CGFloat { Swift.min(255, Swift.max(0, self)) }
}

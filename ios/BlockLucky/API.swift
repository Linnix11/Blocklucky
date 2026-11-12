import Foundation

/// Adresse du site BlockLucky : l'app utilise la même API et la même base que le site.
let SITE = URL(string: "https://block.axionstudio.fr")!

struct CustomTheme: Codable {
    struct Colors: Codable { var bg, surface, ink, primary, festive: String }
    var name: String
    var description: String?
    var colors: Colors
    var font: String
    var corners: String
    var header: String
}

struct City: Codable, Identifiable {
    var id: Int
    var name: String
    var slug: String
    var address: String?
    var theme: String
    var customTheme: CustomTheme?
}

/// Compte connecté : "participant" (habitant), "mairie" ou "admin".
struct Me: Codable {
    var role: String
    var email: String
    var cityId: Int?
}

struct APIError: LocalizedError {
    var message: String
    var pending = false // première connexion : un lien de confirmation a été envoyé par mail
    var errorDescription: String? { message }
}

/// Appels à l'API du site. URLSession garde le cookie de session (`sid`) comme un navigateur.
enum API {
    static func call<T: Decodable>(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        var request = URLRequest(url: SITE.appending(path: "api" + path))
        request.httpMethod = method
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "content-type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let error = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw APIError(message: error ?? "Erreur \(status)")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func cities() async throws -> [City] { try await call("/cities") }
    static func me() async throws -> Me? { try await call("/me") }
    /// Connexion. Première connexion d'un habitant avec envoi de mail : le serveur répond `pending` et un message.
    struct LoginResponse: Decodable { var role: String?; var email: String?; var message: String? }
    static func login(email: String, password: String) async throws -> Me {
        let r: LoginResponse = try await call("/login", method: "POST", body: ["email": email, "password": password])
        guard let role = r.role, let email = r.email else { throw APIError(message: r.message ?? "Connexion impossible", pending: r.message != nil) }
        return try await me() ?? Me(role: role, email: email) // /me donne aussi la ville d'une mairie
    }
    static func logout() async { _ = try? await call("/logout", method: "POST") as [String: Bool] }

    /// L'habitant connecté est-il inscrit dans cette ville ? (même règle que la page de la ville sur le site)
    struct Access: Decodable { var allowed: Bool }
    static func isRegistered(in city: City) async -> Bool {
        (try? await call("/cities/\(city.slug)/access") as Access)?.allowed ?? false
    }

    /// Les villes que ce compte doit voir : celles où l'habitant est inscrit, la ville de la mairie, tout pour l'admin.
    static func myCities(_ me: Me, among cities: [City]) async -> [City] {
        switch me.role {
        case "admin": return cities
        case "mairie": return cities.filter { $0.id == me.cityId }
        default:
            return await withTaskGroup(of: (City, Bool).self) { group in
                for city in cities { group.addTask { (city, await isRegistered(in: city)) } }
                var mine: [City] = []
                for await (city, ok) in group where ok { mine.append(city) }
                return mine.sorted { $0.name < $1.name }
            }
        }
    }

    struct MairieData: Decodable { var city: City }
    static func mairieCity() async throws -> City { try await (call("/mairie") as MairieData).city }

    struct Saved: Decodable { var theme: String }
    static func saveTheme(_ theme: String, custom: CustomTheme? = nil) async throws {
        var body: [String: Any] = ["theme": theme]
        if let custom, let json = try? JSONSerialization.jsonObject(with: JSONEncoder().encode(custom)) { body["custom"] = json }
        _ = try await call("/mairie/theme", method: "POST", body: body) as Saved
    }
}

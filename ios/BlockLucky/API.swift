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
    static func call<T: Decodable>(_ path: String, method: String = "GET", body: [String: Any]? = nil,
                                   timeout: TimeInterval = 60) async throws -> T {
        #if DEBUG
        if let demo = DemoData.response(path) { return try JSONDecoder().decode(T.self, from: demo) }
        #endif
        var request = URLRequest(url: URL(string: SITE.absoluteString + "/api" + path)!, timeoutInterval: timeout)
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

    // MARK: Espace mairie

    struct MairieData: Decodable { var city: City; var participants: [String] }
    static func mairie() async throws -> MairieData { try await call("/mairie") }

    /// Ajoute des habitants : mails et adresses 0x trouvés dans le texte (ou CSV). `replace` vide d'abord la liste.
    struct Added: Decodable { var added: Int }
    static func addParticipants(_ text: String, replace: Bool = false) async throws -> Int {
        try await (call("/mairie/participants", method: "POST", body: ["csv": text, "replace": replace]) as Added).added
    }
    static func removeParticipant(_ identifier: String) async throws {
        _ = try await call("/mairie/participants/" + encode(identifier), method: "DELETE") as [String: Bool]
    }

    /// Actions sur la loterie, signées par le serveur : "round" (ouverture), "draw" (tirage), "retry" (relance).
    struct Tx: Decodable { var hash: String }
    static func mairieAction(_ action: String, body: [String: Any]? = nil) async throws {
        _ = try await call("/mairie/" + action, method: "POST", body: body ?? [:], timeout: 120) as Tx
    }

    /// Proposition de design par Gemini, à partir de la description de la mairie (rien n'est enregistré).
    struct Generated: Decodable { var theme: CustomTheme }
    static func generateTheme(_ description: String) async throws -> CustomTheme {
        try await (call("/mairie/theme/generate", method: "POST", body: ["description": description], timeout: 90) as Generated).theme
    }

    // MARK: Espace admin

    struct AdminCity: Decodable, Identifiable {
        var id: Int
        var name: String
        var slug: String
        var address: String?
        var theme: String
        var mairieEmail: String?
        var participants: Int

        enum CodingKeys: String, CodingKey { case id, name, slug, address, theme, mairieEmail, participants }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            (id, name, slug) = (try c.decode(Int.self, forKey: .id), try c.decode(String.self, forKey: .name), try c.decode(String.self, forKey: .slug))
            address = try c.decodeIfPresent(String.self, forKey: .address)
            theme = try c.decode(String.self, forKey: .theme)
            mairieEmail = try c.decodeIfPresent(String.self, forKey: .mairieEmail)
            // COUNT(*) arrive en nombre ou en texte selon le pilote MySQL
            participants = (try? c.decode(Int.self, forKey: .participants)) ?? Int((try? c.decode(String.self, forKey: .participants)) ?? "") ?? 0
        }
    }
    static func adminCities() async throws -> [AdminCity] { try await call("/admin/cities") }

    /// Crée une mairie et sa loterie. Sans adresse de contrat, le serveur en déploie un (une à deux minutes).
    struct Created: Decodable { var id: Int; var slug: String; var address: String }
    static func createCity(name: String, email: String, password: String, theme: String, contract: String) async throws -> Created {
        var body: [String: Any] = ["name": name, "email": email, "password": password, "theme": theme]
        if !contract.isEmpty { body["contractAddress"] = contract }
        return try await call("/admin/cities", method: "POST", body: body, timeout: 300)
    }
    static func deleteCity(_ id: Int) async throws {
        _ = try await call("/admin/cities/\(id)", method: "DELETE") as [String: Bool]
    }

    static func encode(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "@._-"))) ?? s
    }

    struct Saved: Decodable { var theme: String }
    static func saveTheme(_ theme: String, custom: CustomTheme? = nil) async throws {
        var body: [String: Any] = ["theme": theme]
        if let custom, let json = try? JSONSerialization.jsonObject(with: JSONEncoder().encode(custom)) { body["custom"] = json }
        _ = try await call("/mairie/theme", method: "POST", body: body) as Saved
    }
}

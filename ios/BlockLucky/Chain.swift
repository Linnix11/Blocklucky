import Foundation

/// Lecture du contrat BlockLucky sur Sepolia, par de simples appels JSON-RPC `eth_call`
/// (pas de bibliothèque : on ne fait que lire des nombres). Les sélecteurs sont ceux de l'ABI.
enum Chain {
    static let rpc = URL(string: "https://ethereum-sepolia-rpc.publicnode.com")!
    static let explorer = "https://sepolia.etherscan.io/address/"

    enum Selector: String {
        case state = "0xc19d93fb", roundId = "0x8cd221c9", ticketPrice = "0x1209b1f6", pot = "0x403c9fa8"
        case participants = "0xdd60c898", maxParticipants = "0x24924bf7", maxTickets = "0x2b2f0a0c"
        case timeLeft = "0x1300a6d1", canDraw = "0x3cc82e09", endTime = "0x3197cbb6"
        case tickets = "0x4ed02622", results = "0x1b0c27da"
    }

    /// Résultat d'une loterie terminée (`results[roundId]`). winner = nil : clôturée sans gagnant.
    struct Result {
        var winner: String?
        var prize: Decimal
        var date: Date
    }

    struct Lottery {
        var state = 0 // 0 = fermée, 1 = ouverte, 2 = tirage en cours
        var roundId: Decimal = 0, ticketPrice: Decimal = 0, pot: Decimal = 0
        var participants: Decimal = 0, maxParticipants: Decimal = 0, maxTickets: Decimal = 0
        var endTime = Date.distantPast
        var ticketsSold = 0
        var canDraw = false
        var result: Result?

        var progress: Double {
            maxParticipants == 0 ? 0 : min(1, NSDecimalNumber(decimal: participants / maxParticipants).doubleValue)
        }
    }

    static func read(_ contract: String) async throws -> Lottery {
        async let s = call(contract, .state), r = call(contract, .roundId), t = call(contract, .ticketPrice)
        async let p = call(contract, .pot), n = call(contract, .participants), m = call(contract, .maxParticipants)
        async let w = call(contract, .maxTickets), e = call(contract, .endTime), d = call(contract, .canDraw)
        async let list = raw(contract, Selector.tickets.rawValue)
        let v = try await [s, r, t, p, n, m, w, e, d]
        // Tableau dynamique : 1er mot = position, 2e mot = nombre d'entrées (1 entrée = 1 ticket).
        let ticketsHex = try await list
        var lottery = Lottery(state: int(v[0]), roundId: v[1], ticketPrice: v[2], pot: v[3], participants: v[4],
                              maxParticipants: v[5], maxTickets: v[6], endTime: Date(timeIntervalSince1970: Double(int(v[7]))),
                              ticketsSold: int(uint("0x" + word(ticketsHex, 1))), canDraw: v[8] != 0)
        if lottery.state == 0, lottery.roundId > 0 {
            let hex = try await raw(contract, Selector.results.rawValue + pad(lottery.roundId))
            let winner = "0x" + word(hex, 0).suffix(40)
            lottery.result = Result(winner: winner == "0x" + String(repeating: "0", count: 40) ? nil : winner,
                                    prize: uint("0x" + word(hex, 1)),
                                    date: Date(timeIntervalSince1970: Double(int(uint("0x" + word(hex, 2))))))
        }
        return lottery
    }

    /// Appelle une fonction de lecture sans paramètre et décode le uint256 renvoyé.
    static func call(_ contract: String, _ selector: Selector) async throws -> Decimal {
        uint(try await raw(contract, selector.rawValue))
    }

    /// `eth_call` brut : renvoie la réponse en hexadécimal.
    static func raw(_ contract: String, _ data: String) async throws -> String {
        var request = URLRequest(url: rpc)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "jsonrpc": "2.0", "id": 1, "method": "eth_call",
            "params": [["to": contract, "data": data], "latest"],
        ])
        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let hex = json?["result"] as? String else {
            throw APIError(message: "Lecture de la blockchain impossible. Vérifiez votre connexion.")
        }
        return hex
    }

    /// i-ème mot de 32 octets d'une réponse ("" s'il n'existe pas).
    static func word(_ hex: String, _ i: Int) -> String {
        let body = Array(hex.dropFirst(2))
        let start = i * 64
        return start + 64 <= body.count ? String(body[start..<start + 64]) : ""
    }

    /// Nombre → argument uint256 (64 chiffres hexadécimaux).
    static func pad(_ n: Decimal) -> String {
        let hex = String(UInt64(truncating: NSDecimalNumber(decimal: n)), radix: 16)
        return String(repeating: "0", count: 64 - hex.count) + hex
    }

    static func int(_ d: Decimal) -> Int { NSDecimalNumber(decimal: d).intValue }

    static func short(_ address: String) -> String { "\(address.prefix(6))…\(address.suffix(4))" }

    /// Hexadécimal → nombre exact (Decimal tient les 2^256 d'un uint256 sans perte pour nos montants).
    static func uint(_ hex: String) -> Decimal {
        hex.dropFirst(2).reduce(Decimal(0)) { $0 * 16 + Decimal(Int(String($1), radix: 16) ?? 0) }
    }

    /// wei → "0,0015 ETH"
    static func eth(_ wei: Decimal) -> String {
        let f = NumberFormatter()
        f.locale = Locale(identifier: "fr_FR")
        f.maximumFractionDigits = 6
        f.minimumFractionDigits = 0
        return (f.string(from: NSDecimalNumber(decimal: wei / 1_000_000_000_000_000_000)) ?? "0") + " ETH"
    }
}

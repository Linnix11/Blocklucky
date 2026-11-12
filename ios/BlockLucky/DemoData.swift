#if DEBUG
import Foundation

/// Captures du simulateur sans vrai compte : SIMCTL_CHILD_DEMO_SPACE=mairie ou admin.
/// L'API renvoie alors ces réponses fictives (les contrats, eux, sont lus pour de vrai sur Sepolia).
enum DemoData {
    static let space = ProcessInfo.processInfo.environment["DEMO_SPACE"]

    static func response(_ path: String) -> Data? {
        guard let space else { return nil }
        let json: String? = switch path {
        case "/me": #"{"role":"\#(space)","email":"\#(space)@exemple.fr","cityId":6}"#
        case "/mairie": #"{"city":{"id":6,"name":"montlignon","slug":"montlignon","address":"0x594d9B51e03662B909E00a5bD2695993189Cff71","theme":"patrimoine","customTheme":null},"participants":["alice@exemple.fr","bob@exemple.fr","0x8bfca33275d6281260baaaa73ef84a37aaf89a0a"]}"#
        case "/admin/cities": #"[{"id":2,"name":"EtherBay","slug":"etherbay","address":"0x5aE945f1cD8b026C410c4B1F7720779929434886","theme":"sobre","mairieEmail":"mairie@etherbay.fr","participants":12},{"id":6,"name":"montlignon","slug":"montlignon","address":"0x594d9B51e03662B909E00a5bD2695993189Cff71","theme":"patrimoine","mairieEmail":"mairie@montlignon.fr","participants":"3"},{"id":4,"name":"new1","slug":"new1","address":"0xc02b1dd2d46D258c9303aE32Bb9955e5ACA172fD","theme":"custom","mairieEmail":null,"participants":0}]"#
        default: nil
        }
        return json?.data(using: .utf8)
    }
}
#endif

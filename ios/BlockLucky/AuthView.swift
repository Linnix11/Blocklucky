import SwiftUI

/// Page plein écran de connexion et de première connexion (inscription), mêmes comptes que le site.
///
/// Inscription : c'est la mairie qui inscrit l'adresse mail de l'habitant. À sa première connexion, l'habitant
/// choisit son mot de passe ; si le serveur envoie des mails, il reçoit d'abord un lien de confirmation
/// (même règle que POST /api/login sur le site).
struct AuthView: View {
    enum Mode: String, CaseIterable { case login = "Se connecter", signup = "Première connexion" }
    enum Field { case email, password, confirm }

    @Binding var me: Me?
    @State private var mode: Mode = AuthView.startMode
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var showPassword = false
    @State private var error: String?
    @State private var sentTo: String?   // lien de confirmation envoyé à cette adresse
    @State private var busy = false
    @FocusState private var focus: Field?
    @Environment(\.dismiss) private var dismiss
    private let t = Theme.sobre

    /// En debug, SIMCTL_CHILD_AUTH=signup ouvre directement l'onglet « Première connexion » (captures).
    static var startMode: Mode {
        #if DEBUG
        if ProcessInfo.processInfo.environment["AUTH"] == "signup" { return .signup }
        #endif
        return .login
    }

    var emailValid: Bool { email.wholeMatch(of: /[^\s@]+@[^\s@]+\.[^\s@]+/) != nil }
    var canSubmit: Bool {
        guard emailValid, !password.isEmpty, !busy else { return false }
        return mode == .login || (password.count >= 6 && password == confirm)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                VStack(spacing: 18) {
                    if let sentTo { MailSent(email: sentTo) { withAnimation { self.sentTo = nil; mode = .login; password = "" } } }
                    else { formCard }
                    if mode == .signup && sentTo == nil { steps }
                    Button("Continuer sans compte") { dismiss() }
                        .font(.subheadline.weight(.semibold)).foregroundStyle(t.ink2)
                        .frame(minHeight: 44)
                }
                .padding(16)
                .padding(.top, -40)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(t.bg.ignoresSafeArea())
        .environment(\.theme, t)
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "xmark").font(.subheadline.weight(.bold)).foregroundStyle(.white)
                    .frame(width: 36, height: 36).background(.white.opacity(0.18), in: Circle())
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Fermer")
            .padding(.trailing, 12)
        }
        .sensoryFeedback(.error, trigger: error)
        .sensoryFeedback(.selection, trigger: mode)
    }

    // MARK: En-tête

    var header: some View {
        VStack(spacing: 14) {
            Image("Logo").resizable().frame(width: 84, height: 84)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(.white.opacity(0.25), lineWidth: 1))
                .shadow(color: .black.opacity(0.25), radius: 14, y: 8)
                .accessibilityHidden(true)
            Text(mode == .login ? "Bon retour parmi nous" : "Activez votre compte")
                .font(.title.weight(.heavy)).contentTransition(.opacity)
            Text(mode == .login
                 ? "Connectez-vous pour retrouver la loterie de votre ville."
                 : "Votre mairie vous a inscrit avec votre adresse mail : choisissez votre mot de passe.")
                .font(.subheadline).opacity(0.9).multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 28)
        .padding(.top, 56)
        .padding(.bottom, 64)
        .frame(maxWidth: .infinity)
        .background(
            ZStack(alignment: .bottomLeading) {
                LinearGradient(colors: [t.primary, Color.hex("#163a6b")], startPoint: .top, endPoint: .bottom)
                Image(systemName: "ticket.fill").font(.system(size: 160)).foregroundStyle(.white.opacity(0.06))
                    .rotationEffect(.degrees(-20)).offset(x: -40, y: 30)
                    .accessibilityHidden(true)
            }
            .padding(.top, -600) // couvre aussi la zone de la barre d'état
        )
    }

    // MARK: Formulaire

    var formCard: some View {
        Card(padding: 18) {
            ModeSwitch(mode: $mode)
                .onChange(of: mode) { error = nil; confirm = "" }

            VStack(alignment: .leading, spacing: 14) {
                InputField(label: "Adresse mail", icon: "envelope.fill", prompt: "prenom.nom@exemple.fr",
                           error: !email.isEmpty && !emailValid && focus != .email ? "Cette adresse mail n'est pas valide." : nil) {
                    TextField("", text: $email, prompt: Text("prenom.nom@exemple.fr"))
                        .textContentType(.username).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .focused($focus, equals: .email).submitLabel(.next)
                        .onSubmit { focus = .password }
                }

                InputField(label: mode == .login ? "Mot de passe" : "Choisissez un mot de passe", icon: "lock.fill", prompt: "",
                           hint: mode == .signup ? (password.count >= 6 ? "6 caractères minimum ✓" : "6 caractères minimum") : nil,
                           hintOK: password.count >= 6) {
                    HStack {
                        Group {
                            if showPassword { TextField("", text: $password, prompt: Text("Votre mot de passe")) }
                            else { SecureField("", text: $password, prompt: Text("Votre mot de passe")) }
                        }
                        .textContentType(mode == .login ? .password : .newPassword)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .focused($focus, equals: .password)
                        .submitLabel(mode == .login ? .go : .next)
                        .onSubmit { mode == .login ? submit() : (focus = .confirm) }
                        Button { showPassword.toggle() } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye").foregroundStyle(t.ink2)
                                .frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe")
                    }
                }

                if mode == .signup {
                    InputField(label: "Confirmez le mot de passe", icon: "lock.rotation", prompt: "",
                               error: !confirm.isEmpty && confirm != password && focus != .confirm ? "Les deux mots de passe ne correspondent pas." : nil) {
                        SecureField("", text: $confirm, prompt: Text("Le même mot de passe"))
                            .textContentType(.newPassword)
                            .focused($focus, equals: .confirm).submitLabel(.go)
                            .onSubmit(submit)
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .padding(.top, 6)

            if let error {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.subheadline.weight(.medium)).foregroundStyle(t.festive)
                    .padding(12).frame(maxWidth: .infinity, alignment: .leading)
                    .background(t.festive.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                    .accessibilityAddTraits(.isStaticText)
            }

            Button(action: submit) {
                HStack(spacing: 10) {
                    if busy { ProgressView().tint(.white) }
                    Text(busy ? "Un instant…" : mode == .login ? "Se connecter" : "Activer mon compte").font(.headline)
                }
                .frame(maxWidth: .infinity, minHeight: 54)
                .foregroundStyle(.white)
                .background(t.primary.opacity(canSubmit || busy ? 1 : 0.45), in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(PressableStyle())
            .disabled(!canSubmit)
            .padding(.top, 4)

            Button { withAnimation(.snappy) { mode = mode == .login ? .signup : .login } } label: {
                (Text(mode == .login ? "Pas encore de mot de passe ? " : "Déjà un mot de passe ? ").foregroundStyle(t.ink2)
                 + Text(mode == .login ? "Première connexion" : "Se connecter").foregroundStyle(t.primary).bold())
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.plain)
        }
        .font(.subheadline)
        .animation(.snappy, value: mode)
    }

    var steps: some View {
        Card {
            SectionTitle(title: "Comment s'inscrire ?", icon: "list.number")
            StepRow(number: 1, title: "La mairie vous inscrit", text: "Elle enregistre votre adresse mail pour la loterie de la ville.")
            StepRow(number: 2, title: "Vous activez votre compte", text: "Ici, avec cette adresse et le mot de passe de votre choix.")
            StepRow(number: 3, title: "Vous jouez", text: "Votre loterie apparaît à l'accueil de l'app.")
        }
        .transition(.opacity)
    }

    func submit() {
        guard canSubmit else { return }
        focus = nil
        Task {
            busy = true
            error = nil
            defer { busy = false }
            do {
                me = try await API.login(email: email.trimmingCharacters(in: .whitespaces).lowercased(), password: password)
                dismiss()
            } catch let e as APIError where e.pending {
                withAnimation { sentTo = email }
            } catch let e as APIError where mode == .signup && e.message == "Mot de passe incorrect" {
                error = "Ce compte est déjà activé : connectez-vous avec votre mot de passe."
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

/// Les deux onglets « Se connecter » / « Première connexion ».
struct ModeSwitch: View {
    @Environment(\.theme) private var t
    @Binding var mode: AuthView.Mode
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AuthView.Mode.allCases, id: \.self) { item in
                Button { withAnimation(.snappy) { mode = item } } label: {
                    Text(item.rawValue).font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .foregroundStyle(mode == item ? t.ink : t.ink2)
                        .background {
                            if mode == item {
                                RoundedRectangle(cornerRadius: 10).fill(t.surface)
                                    .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
                                    .matchedGeometryEffect(id: "tab", in: ns)
                            }
                        }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(mode == item ? .isSelected : [])
            }
        }
        .padding(4)
        .background(t.surface2, in: RoundedRectangle(cornerRadius: 13))
    }
}

/// Champ avec son libellé au-dessus, une icône, et une erreur ou une indication en dessous.
struct InputField<Content: View>: View {
    @Environment(\.theme) private var t
    let label: String, icon: String, prompt: String
    var error: String?
    var hint: String?
    var hintOK = false
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.footnote.weight(.semibold)).foregroundStyle(t.ink)
            HStack(spacing: 10) {
                Image(systemName: icon).foregroundStyle(t.primary).frame(width: 20).accessibilityHidden(true)
                content.font(.body).foregroundStyle(t.ink)
            }
            .padding(.leading, 14)
            .frame(minHeight: 50)
            .background(t.surface2, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(error == nil ? t.line : t.festive, lineWidth: error == nil ? 1 : 1.5))
            if let error {
                Text(error).font(.caption.weight(.medium)).foregroundStyle(t.festive)
            } else if let hint {
                Text(hint).font(.caption).foregroundStyle(hintOK ? Color.green : t.ink2)
            }
        }
    }
}

struct StepRow: View {
    @Environment(\.theme) private var t
    let number: Int, title: String, text: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)").font(.subheadline.weight(.heavy)).foregroundStyle(t.onPrimary)
                .frame(width: 30, height: 30).background(t.primary, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.bold))
                Text(text).font(.footnote).foregroundStyle(t.ink2).fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Première connexion avec envoi de mail : le lien de confirmation est parti.
struct MailSent: View {
    @Environment(\.theme) private var t
    let email: String
    let onDone: () -> Void
    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 12) {
                Image(systemName: "envelope.open.badge.clock").font(.system(size: 46)).foregroundStyle(t.primary)
                    .frame(width: 96, height: 96).background(t.primary.opacity(0.1), in: Circle())
                    .accessibilityHidden(true)
                Text("Vérifiez votre boîte mail").font(.title2.weight(.bold))
                Text("Un lien de confirmation vient d'être envoyé à \(email). Ouvrez-le pour choisir votre mot de passe, puis revenez vous connecter ici.")
                    .font(.subheadline).foregroundStyle(t.ink2).multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Pensez à regarder dans les courriers indésirables.").font(.footnote).foregroundStyle(t.ink2)
            }
            .frame(maxWidth: .infinity)
            PrimaryButton(title: "C'est fait, me connecter", icon: "checkmark.circle.fill", trailingIcon: nil, action: onDone)
        }
    }
}

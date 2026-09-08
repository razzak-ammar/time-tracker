import SwiftUI

struct AuthenticationView: View {
    @ObservedObject var store: FirebaseTimeTrackerStore
    @State private var email = ""
    @State private var password = ""
    @State private var mode: Mode = .signIn
    @State private var isSubmitting = false

    private enum Mode { case signIn, signUp }

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Spacer()
                Image(systemName: "timer.circle.fill")
                    .font(.system(size: 72)).foregroundStyle(Color.brandNavy)
                Text("Time Tracker").font(.largeTitle.bold())
                Text(mode == .signIn ? "Sign in to sync your projects and timers." : "Create an account to start syncing.")
                    .foregroundStyle(.secondary).multilineTextAlignment(.center)
                VStack(spacing: 12) {
                    TextField("Email", text: $email).textInputAutocapitalization(.never).keyboardType(.emailAddress).textContentType(.emailAddress)
                    SecureField("Password", text: $password).textContentType(mode == .signIn ? .password : .newPassword)
                }
                .textFieldStyle(.roundedBorder)
                Button(mode == .signIn ? "Sign In" : "Create Account") { submit() }
                    .buttonStyle(.borderedProminent).disabled(isSubmitting || email.isEmpty || password.count < 6)
                Button(mode == .signIn ? "Need an account? Sign Up" : "Already have an account? Sign In") {
                    mode = mode == .signIn ? .signUp : .signIn
                }
                .font(.subheadline)
                Spacer()
            }
            .padding(28)
        }
    }

    private func submit() {
        isSubmitting = true
        Task {
            if mode == .signIn { await store.signIn(email: email, password: password) }
            else { await store.signUp(email: email, password: password) }
            isSubmitting = false
        }
    }
}

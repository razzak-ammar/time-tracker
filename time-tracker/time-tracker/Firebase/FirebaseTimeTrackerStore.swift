import FirebaseAuth
import FirebaseFirestore
import Combine
import Foundation

@MainActor
final class FirebaseTimeTrackerStore: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var projects: [FirebaseProject] = []
    @Published private(set) var timeEntries: [FirebaseTimeEntry] = []
    @Published private(set) var isRestoringSession = true
    @Published var errorMessage: String?

    var activeTimeEntry: FirebaseTimeEntry? { timeEntries.first { $0.isActive } }

    private let service = FirebaseService()
    private var authHandle: AuthStateDidChangeListenerHandle?
    private var projectListener: ListenerRegistration?
    private var entryListener: ListenerRegistration?

    init() {
        authHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor [weak self] in self?.handleAuthChange(user) }
        }
    }

    deinit {
        if let authHandle { Auth.auth().removeStateDidChangeListener(authHandle) }
        projectListener?.remove()
        entryListener?.remove()
    }

    func signIn(email: String, password: String) async {
        await perform { _ = try await Auth.auth().signIn(withEmail: email, password: password) }
    }

    func signUp(email: String, password: String) async {
        await perform { _ = try await Auth.auth().createUser(withEmail: email, password: password) }
    }

    func signOut() async { await perform { try Auth.auth().signOut() } }

    func toggleTimer(for projectId: String) async {
        guard let user else { return }
        await perform {
            if let active = self.activeTimeEntry {
                if active.projectId == projectId {
                    try await self.service.stopTimeEntry(id: active.id)
                } else {
                    try await self.service.stopTimeEntry(id: active.id)
                    try await self.service.createTimeEntry(projectId: projectId, userId: user.uid, startTime: .now, isActive: true)
                }
            } else {
                try await self.service.createTimeEntry(projectId: projectId, userId: user.uid, startTime: .now, isActive: true)
            }
        }
    }

    func createProject(name: String, color: String) async {
        guard let user else { return }
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        await perform { try await self.service.createProject(name: trimmedName, color: color, userId: user.uid) }
    }

    private func handleAuthChange(_ user: User?) {
        self.user = user
        isRestoringSession = false
        projectListener?.remove(); entryListener?.remove()
        projects = []; timeEntries = []
        guard let user else { return }
        projectListener = service.observeProjects(userId: user.uid) { [weak self] result in
            Task { @MainActor [weak self] in self?.apply(result, to: \.projects) }
        }
        entryListener = service.observeTimeEntries(userId: user.uid) { [weak self] result in
            Task { @MainActor [weak self] in self?.apply(result, to: \.timeEntries) }
        }
    }

    private func apply<T>(_ result: Result<[T], Error>, to keyPath: ReferenceWritableKeyPath<FirebaseTimeTrackerStore, [T]>) {
        switch result {
        case .success(let values): self[keyPath: keyPath] = values
        case .failure(let error): errorMessage = error.localizedDescription
        }
    }

    private func perform(_ operation: () async throws -> Void) async {
        do { try await operation() }
        catch { errorMessage = error.localizedDescription }
    }
}

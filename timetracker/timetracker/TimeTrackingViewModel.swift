//
//  TimeTrackingViewModel.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import Foundation
import FirebaseAuth
import FirebaseFirestore
import Combine

@MainActor
class TimeTrackingViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var timeEntries: [TimeEntry] = []
    @Published var activeTimeEntry: TimeEntry?
    @Published var elapsedTime: TimeInterval = 0
    
    var formattedElapsedTime: String {
        let hours = Int(elapsedTime) / 3600
        let minutes = Int(elapsedTime) % 3600 / 60
        let seconds = Int(elapsedTime) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showingNewProject = false
    
    
    
    let firebaseService = FirebaseService()
    private var cancellables = Set<AnyCancellable>()
    private var projectListener: ListenerRegistration?
    private var timeEntryListener: ListenerRegistration?
    private var activeTimeEntryListener: ListenerRegistration?
    private var timer: Timer?
    
    init() {
        setupAuthListener()
    }
    
    deinit {
        // Clean up listeners synchronously to avoid actor isolation issues
        projectListener?.remove()
        projectListener = nil
        timeEntryListener?.remove()
        timeEntryListener = nil
        activeTimeEntryListener?.remove()
        activeTimeEntryListener = nil
        timer?.invalidate()
        timer = nil
        cancellables.removeAll()
    }
    
    private func setupAuthListener() {
        _ = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.currentUser = user
                if let user = user {
                    self?.subscribeToData(userId: user.uid)
                } else {
                    self?.cleanupListeners()
                    self?.projects = []
                    self?.timeEntries = []
                                    self?.activeTimeEntry = nil
                self?.elapsedTime = 0
                }
            }
        }
    }
    
    private func subscribeToData(userId: String) {
        // Subscribe to projects
        projectListener = firebaseService.subscribeToProjects(userId: userId) { [weak self] projects in
            Task { @MainActor in
                self?.projects = projects
            }
        }
        
        // Subscribe to time entries
        timeEntryListener = firebaseService.subscribeToTimeEntries(userId: userId) { [weak self] timeEntries in
            Task { @MainActor in
                self?.timeEntries = timeEntries
            }
        }
        
        // Subscribe to active time entry
        activeTimeEntryListener = firebaseService.subscribeToActiveTimeEntry(userId: userId) { [weak self] timeEntry in
            Task { @MainActor in
                self?.activeTimeEntry = timeEntry
                self?.updateElapsedTime()
            }
        }
    }
    
    private func cleanupListeners() {
        projectListener?.remove()
        projectListener = nil
        timeEntryListener?.remove()
        timeEntryListener = nil
        activeTimeEntryListener?.remove()
        activeTimeEntryListener = nil
        timer?.invalidate()
        timer = nil
        cancellables.removeAll()
    }
    
    private func updateElapsedTime() {
        timer?.invalidate()
        
        guard let activeTimeEntry = activeTimeEntry else {
            elapsedTime = 0
            return
        }
        
        let updateTime = { [weak self] in
            self?.elapsedTime = Date().timeIntervalSince(activeTimeEntry.startTime)
        }
        
        updateTime()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            updateTime()
        }
    }
    
    func startTracking(projectId: String) async {
        guard let user = currentUser else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let newTimeEntry = TimeEntry(
                id: "",
                projectId: projectId,
                userId: user.uid,
                startTime: Date(),
                isActive: true
            )
            
            _ = try await firebaseService.createTimeEntry(newTimeEntry)
        } catch {
            errorMessage = "Failed to start tracking: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func stopTracking() async {
        guard let activeTimeEntry = activeTimeEntry else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await firebaseService.updateTimeEntry(activeTimeEntry.id, updates: [
                "endTime": Date(),
                "isActive": false
            ])
        } catch {
            errorMessage = "Failed to stop tracking: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func updateTimeEntryDescription(timeEntryId: String, description: String) async {
        do {
            try await firebaseService.updateTimeEntry(timeEntryId, updates: ["description": description])
        } catch {
            errorMessage = "Failed to update description: \(error.localizedDescription)"
        }
    }
    
    func createProject(name: String, color: String) async {
        guard let user = currentUser else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let project = Project(
                id: "",
                name: name,
                color: color,
                userId: user.uid
            )
            
            _ = try await firebaseService.createProject(project)
        } catch {
            errorMessage = "Failed to create project: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func toggleProjectPin(project: Project) async {
        do {
            try await firebaseService.updateProject(project.id, updates: ["isPinned": !project.isPinned])
        } catch {
            errorMessage = "Failed to update project: \(error.localizedDescription)"
        }
    }
    
    func deleteProject(_ project: Project) async {
        do {
            try await firebaseService.deleteProject(project.id)
        } catch {
            errorMessage = "Failed to delete project: \(error.localizedDescription)"
        }
    }
    
    func getTimeEntriesForProject(projectId: String) -> [TimeEntry] {
        return timeEntries.filter { $0.projectId == projectId }
    }
    
    func getPinnedProjects() -> [Project] {
        return projects.filter { $0.isPinned }
    }
    
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await firebaseService.signIn(email: email, password: password)
        } catch {
            print("Firebase signin error: \(error)")
            if let nsError = error as NSError? {
                switch nsError.code {
                case -1003:
                    errorMessage = "Network error: Cannot connect to Firebase. Please check your internet connection."
                case -1009:
                    errorMessage = "No internet connection. Please connect to the internet and try again."
                case 17009:
                    errorMessage = "Invalid email or password. Please check your credentials."
                case 17011:
                    errorMessage = "User not found. Please check your email or sign up."
                default:
                    errorMessage = "Sign in failed: \(error.localizedDescription)"
                }
            } else {
                errorMessage = "Sign in failed: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await firebaseService.signUp(email: email, password: password)
        } catch {
            print("Firebase signup error: \(error)")
            if let nsError = error as NSError? {
                switch nsError.code {
                case -1003:
                    errorMessage = "Network error: Cannot connect to Firebase. Please check your internet connection."
                case -1009:
                    errorMessage = "No internet connection. Please connect to the internet and try again."
                case 17007:
                    errorMessage = "Email already in use. Please try signing in instead."
                case 17008:
                    errorMessage = "Invalid email format. Please enter a valid email address."
                case 17026:
                    errorMessage = "Password is too weak. Please use at least 6 characters."
                default:
                    errorMessage = "Sign up failed: \(error.localizedDescription)"
                }
            } else {
                errorMessage = "Sign up failed: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    func signOut() {
        do {
            try firebaseService.signOut()
        } catch {
            errorMessage = "Sign out failed: \(error.localizedDescription)"
        }
    }
}

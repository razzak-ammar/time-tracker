//
//  AuthView.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI

struct AuthView: View {
    @EnvironmentObject var viewModel: TimeTrackingViewModel
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            // Beautiful background gradient
            Theme.backgroundGradient
                .ignoresSafeArea()
            
            // Animated background elements
            GeometryReader { geometry in
                ZStack {
                    // Floating circles
                    Circle()
                        .fill(Theme.primary.opacity(0.1))
                        .frame(width: 200, height: 200)
                        .offset(x: geometry.size.width * 0.8, y: geometry.size.height * 0.2)
                        .scaleEffect(isAnimating ? 1.2 : 1.0)
                        .animation(.easeInOut(duration: 3).repeatForever(autoreverses: true), value: isAnimating)
                    
                    Circle()
                        .fill(Theme.primaryLight.opacity(0.08))
                        .frame(width: 150, height: 150)
                        .offset(x: geometry.size.width * 0.1, y: geometry.size.height * 0.8)
                        .scaleEffect(isAnimating ? 0.8 : 1.0)
                        .animation(.easeInOut(duration: 4).repeatForever(autoreverses: true), value: isAnimating)
                }
            }
            
            VStack(spacing: 0) {
                Spacer()
                
                // Main content card
                VStack(spacing: 40) {
                    // Logo and branding
                    VStack(spacing: 20) {
                        // Animated logo
                        ZStack {
                            Circle()
                                .fill(Theme.primaryGradient)
                                .frame(width: 80, height: 80)
                                .shadow(color: Theme.primary.opacity(0.3), radius: 20, x: 0, y: 10)
                            
                            Image(systemName: "clock.fill")
                                .font(.system(size: 36, weight: .medium))
                                .foregroundStyle(.white)
                                .scaleEffect(isAnimating ? 1.1 : 1.0)
                                .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: isAnimating)
                        }
                        
                        VStack(spacing: 8) {
                            Text("TimeTracker")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .foregroundStyle(Theme.textPrimary)
                            
                            Text("Track your time with ease")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(Theme.textSecondary)
                        }
                    }
                    
                    // Auth form
                    VStack(spacing: 24) {
                        VStack(spacing: 16) {
                            // Email field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.textPrimary)
                                
                                TextField("Enter your email", text: $email)
                                    .textFieldStyle(ModernTextFieldStyle())
                            }
                            
                            // Password field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.textPrimary)
                                
                                SecureField("Enter your password", text: $password)
                                    .textFieldStyle(ModernTextFieldStyle())
                            }
                            
                            // Confirm password (only for sign up)
                            if isSignUp {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Confirm Password")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.textPrimary)
                                    
                                    SecureField("Confirm your password", text: $confirmPassword)
                                        .textFieldStyle(ModernTextFieldStyle())
                                }
                                .transition(.asymmetric(
                                    insertion: .scale.combined(with: .opacity),
                                    removal: .scale.combined(with: .opacity)
                                ))
                            }
                        }
                        
                        // Error message
                        if let errorMessage = viewModel.errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(Theme.error)
                                    .font(.system(size: 14))
                                
                                Text(errorMessage)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(Theme.error)
                                    .multilineTextAlignment(.leading)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(Theme.error.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .transition(.scale.combined(with: .opacity))
                        }
                        
                        // Action button
                        Button(action: handleAuth) {
                            HStack(spacing: 12) {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                        .tint(.white)
                                } else {
                                    Image(systemName: isSignUp ? "person.badge.plus" : "person.fill")
                                        .font(.system(size: 16, weight: .semibold))
                                }
                                
                                Text(isSignUp ? "Create Account" : "Sign In")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .foregroundStyle(.white)
                        }
                        .buttonStyle()
                        .disabled(viewModel.isLoading || !isValidForm)
                        .opacity(isValidForm ? 1.0 : 0.6)
                        
                        // Toggle auth mode
                        Button(action: { 
                            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                                isSignUp.toggle()
                            }
                        }) {
                            Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Theme.primary)
                        }
                        .disabled(viewModel.isLoading)
                    }
                }
                .padding(40)
                .frame(maxWidth: 400)
                .floatingCardStyle()
                .padding(.horizontal, 20)
                
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5)) {
                isAnimating = true
            }
        }
    }
    
    private var isValidForm: Bool {
        if isSignUp {
            return !email.isEmpty && !password.isEmpty && password == confirmPassword && password.count >= 6
        } else {
            return !email.isEmpty && !password.isEmpty
        }
    }
    
    private func handleAuth() {
        Task {
            if isSignUp {
                await viewModel.signUp(email: email, password: password)
            } else {
                await viewModel.signIn(email: email, password: password)
            }
        }
    }
}



#Preview {
    AuthView()
        .environmentObject(TimeTrackingViewModel())
}

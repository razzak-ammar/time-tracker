//
//  Theme.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI

struct Theme {
    // MARK: - Colors
    static let primary = Color(red: 0.2, green: 0.6, blue: 1.0)
    static let primaryLight = Color(red: 0.3, green: 0.7, blue: 1.0)
    static let secondary = Color(red: 0.95, green: 0.95, blue: 0.97)
    static let background = Color(red: 0.98, green: 0.98, blue: 1.0)
    static let cardBackground = Color.white
    static let textPrimary = Color(red: 0.1, green: 0.1, blue: 0.15)
    static let textSecondary = Color(red: 0.4, green: 0.4, blue: 0.5)
    static let textTertiary = Color(red: 0.6, green: 0.6, blue: 0.7)
    static let border = Color(red: 0.9, green: 0.9, blue: 0.95)
    static let success = Color(red: 0.2, green: 0.8, blue: 0.4)
    static let warning = Color(red: 1.0, green: 0.6, blue: 0.2)
    static let error = Color(red: 1.0, green: 0.3, blue: 0.3)
    
    // MARK: - Gradients
    static let primaryGradient = LinearGradient(
        colors: [primary, primaryLight],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let secondaryGradient = LinearGradient(
        colors: [secondary, secondary.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let errorGradient = LinearGradient(
        colors: [error, error.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let backgroundGradient = LinearGradient(
        colors: [background, secondary],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let cardGradient = LinearGradient(
        colors: [cardBackground, Color(red: 0.99, green: 0.99, blue: 1.0)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // MARK: - Shadows
    static let cardShadow = Shadow(
        color: Color.black.opacity(0.05),
        radius: 10,
        x: 0,
        y: 2
    )
    
    static let buttonShadow = Shadow(
        color: Color.black.opacity(0.1),
        radius: 8,
        x: 0,
        y: 2
    )
    
    static let floatingShadow = Shadow(
        color: Color.black.opacity(0.15),
        radius: 20,
        x: 0,
        y: 8
    )
}

struct Shadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

// MARK: - Text Field Style
struct ModernTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Theme.secondary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Theme.border, lineWidth: 1)
            )
    }
}

// MARK: - Color Extensions
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension View {
    func cardStyle() -> some View {
        self
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(
                color: Theme.cardShadow.color,
                radius: Theme.cardShadow.radius,
                x: Theme.cardShadow.x,
                y: Theme.cardShadow.y
            )
    }
    
    func buttonStyle() -> some View {
        self
            .background(Theme.primaryGradient)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(
                color: Theme.buttonShadow.color,
                radius: Theme.buttonShadow.radius,
                x: Theme.buttonShadow.x,
                y: Theme.buttonShadow.y
            )
    }
    
    func floatingCardStyle() -> some View {
        self
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(
                color: Theme.floatingShadow.color,
                radius: Theme.floatingShadow.radius,
                x: Theme.floatingShadow.x,
                y: Theme.floatingShadow.y
            )
    }
}

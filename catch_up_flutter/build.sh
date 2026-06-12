#!/bin/bash

# Catch Up Flutter Build Script

echo "🚀 Building Catch Up Flutter App..."

# Clean
echo "📦 Cleaning build artifacts..."
flutter clean

# Get dependencies
echo "📥 Installing dependencies..."
flutter pub get

# Generate code (freezed, json_serializable)
echo "🔧 Generating code..."
flutter pub run build_runner build --delete-conflicting-outputs

# Analyze
echo "🔍 Analyzing code..."
flutter analyze

# Run tests
echo "🧪 Running tests..."
flutter test

echo "✅ Build preparation complete!"
echo ""
echo "Run the app with:"
echo "  flutter run"
echo ""
echo "Build for production:"
echo "  Android APK:  flutter build apk --release"
echo "  Android AAB:  flutter build appbundle --release"
echo "  iOS:          flutter build ios --release"
echo "  Web:          flutter build web --release"

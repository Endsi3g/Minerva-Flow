#!/usr/bin/env bash
set -euo pipefail

# The repository pins every Swift package in xcshareddata/swiftpm/Package.resolved.
# Xcode 26 can otherwise re-open the resolver on every build and hang while
# checking remote tags. Keep local simulator builds deterministic and offline.
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_CACHE="${PACKAGE_CACHE:-$(find "$HOME/Library/Developer/Xcode/DerivedData" -path '*MinervaFlow-*/SourcePackages' -type d -name SourcePackages | head -1)}"

if [[ -z "$PACKAGE_CACHE" ]]; then
  echo "Aucun cache Swift Package trouvé. Ouvrez Xcode une fois pour résoudre les dépendances." >&2
  exit 2
fi

# Reuse the same DerivedData directory as the package cache by default. This
# prevents a second multi-gigabyte copy of Supabase/Sentry artifacts on small
# developer volumes; override DERIVED_DATA when an isolated build is needed.
DERIVED_DATA="${DERIVED_DATA:-$(dirname "$PACKAGE_CACHE")}"

xcodebuild \
  -project "$ROOT_DIR/MinervaFlow.xcodeproj" \
  -scheme MinervaFlow \
  -destination 'generic/platform=iOS Simulator' \
  -configuration Debug \
  -derivedDataPath "$DERIVED_DATA" \
  -clonedSourcePackagesDirPath "$PACKAGE_CACHE" \
  -disableAutomaticPackageResolution \
  -onlyUsePackageVersionsFromResolvedFile \
  -skipPackageUpdates \
  CODE_SIGNING_ALLOWED=NO \
  build

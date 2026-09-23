#!/bin/bash
set -euo pipefail

# Swift Package Manager ships Sentry as a prebuilt XCFramework. Xcode links the
# device slice but does not always copy that slice's dSYM into the archive.
# App Store Connect then reports the framework UUID as missing. Copy the exact
# device dSYM next to the app dSYM so the archive remains symbolicated.

if [[ "${CONFIGURATION:-}" != "Release" ]]; then
  exit 0
fi

destination="${DWARF_DSYM_FOLDER_PATH:?DWARF_DSYM_FOLDER_PATH is required}"
framework_binary="${TARGET_BUILD_DIR:?TARGET_BUILD_DIR is required}/${WRAPPER_NAME:?WRAPPER_NAME is required}/Frameworks/Sentry.framework/Sentry"
if [[ ! -f "$framework_binary" ]]; then
  echo "warning: Sentry binary was not found at $framework_binary"
  exit 0
fi

mkdir -p "$destination"
rm -rf "$destination/Sentry.framework.dSYM"
dsymutil "$framework_binary" -o "$destination/Sentry.framework.dSYM"
echo "Generated Sentry dSYM for $(dwarfdump --uuid "$framework_binary" | awk '/UUID:/ {print $2; exit}')"

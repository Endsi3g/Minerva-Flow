#!/bin/sh
set -eu

app_path="${TARGET_BUILD_DIR}/${WRAPPER_NAME}"
if [ ! -d "$app_path" ]; then
  exit 0
fi

find "$app_path" -type f -name PrivacyInfo.xcprivacy -print0 |
while IFS= read -r -d '' manifest; do
  accessed_api_types=$(/usr/libexec/PlistBuddy -c 'Print :NSPrivacyAccessedAPITypes' "$manifest" 2>/dev/null || true)
  [ -n "$accessed_api_types" ] || continue

  entry_count=$(printf '%s\n' "$accessed_api_types" | awk '/^[[:space:]]*[0-9]+ = / { count++ } END { print count + 0 }')
  if [ "$entry_count" -eq 0 ]; then
    chmod u+w "$manifest"
    /usr/libexec/PlistBuddy -c 'Delete :NSPrivacyAccessedAPITypes' "$manifest"
    echo "Removed empty NSPrivacyAccessedAPITypes from ${manifest#${app_path}/}"
  fi
done

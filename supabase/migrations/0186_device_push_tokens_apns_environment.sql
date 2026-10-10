-- APNs issues different tokens for Xcode/dev builds (sandbox) and for
-- TestFlight/App Store builds (production). Sending a sandbox token to the
-- production host answers BadDeviceToken, which used to delete the token and
-- silently stop every notification for that device. The app now reports which
-- environment its build uses so the server picks the right host.
alter table device_push_tokens
  add column if not exists apns_environment text
  check (apns_environment is null or apns_environment in ('sandbox', 'production'));

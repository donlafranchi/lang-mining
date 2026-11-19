# 032 Notify when a lesson finishes

- Web Push for the installed iPhone PWA (iOS 16.4+). Toggle in Settings; permission asked from that tap.
- Migration 0009 `push_subscriptions` (per user, unique endpoint). Gone subscriptions (404/410) are removed on send.
- Sent from the server after a build or re-run finishes (ready, or failed). Tapping opens the lesson.
- Off unless VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (and VAPID_SUBJECT) are set. Make keys: npx web-push generate-vapid-keys
- Not verified: real iPhone delivery.

# 041 Loading screen for opening the app, update banner, avatar on the right

- The loading screen (name, tagline, big emoji; no "Doh") now shows only when the app is opened or fully reloaded: it is in the page's HTML and goes once the app's code starts. It no longer appears between views inside the app (removed the route loading page). A style rule hides it after 8 seconds whatever happens.
- Update banner: the build each phone runs (commit SHA baked in as NEXT_PUBLIC_BUILD_ID) is compared with the live one from /api/version, on open, on return to the app, and every 10 minutes. If they differ: "A new version is ready. [Update]" (a reload). Never shown in development.
- Avatar and its menu are on the top right; the app name is on the left.
- Other ways to tell people about a release (not built): a push notification to everyone with notifications on.

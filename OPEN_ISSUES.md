# Open Issues

## Authentication & Identity for Desktop App

**Current state:** Supercut uses standard JWT auth (email + password login) stored in
localStorage. This works for web and basic Electron, but is not the right long-term
solution for a native desktop distribution.

**What needs to be resolved:**

- How does a packaged Electron/native app identify itself to the API server?
- Should each installation get a fixed API key? If so, how is it provisioned and tied to a user account?
- Should we implement OAuth 2.0 Device Flow (RFC 8628) — the standard used by GitHub CLI, VS Code, Figma — where the desktop app authenticates via a browser session on supercut.com?
- Where does billing/credits live — per user account, per installation, per team?
- Is there a supercut.com web identity provider, or is everything self-contained?
- Token storage in production: OS keychain (`keytar`) instead of localStorage
- Offline usage: does the app need to work without internet?

**Talk to Gadi before implementing.**

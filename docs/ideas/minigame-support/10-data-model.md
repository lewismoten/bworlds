# Data Model

## Core Tables

- [ ] Create a `users` table.
- [ ] Create an `identities` table.
- [ ] Create a `webauthn_credentials` table.
- [ ] Create a `totp_credentials` table.
- [ ] Create a `recovery_codes` table.
- [ ] Create a `user_sessions` table.
- [ ] Create a `minigames` table.
- [ ] Create a `minigame_versions` table.
- [ ] Create a `minigame_sessions` table.
- [ ] Create an `achievement_defs` table.
- [ ] Create a `user_achievements` table.
- [ ] Create a `skill_transactions` table.
- [ ] Create a `character_skills` table.
- [ ] Create an `inventory_transactions` table.
- [ ] Create a `leaderboard_entries` table.
- [ ] Create a `multiplayer_matches` table.
- [ ] Create a `match_players` table.
- [ ] Create an `audit_events` table.

## Data Rules

- [ ] Use immutable IDs for externally referenced records.
- [ ] Use server timestamps for authoritative events.
- [ ] Store money and points as integers.
- [ ] Use append-only ledgers for important balances.
- [ ] Avoid deleting audit records during normal cleanup.
- [ ] Separate display names from account identity.
- [ ] Keep external provider IDs unique per provider.
- [ ] Store minigame plugin IDs on reward transactions.

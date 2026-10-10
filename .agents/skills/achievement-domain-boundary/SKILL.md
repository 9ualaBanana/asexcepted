---
name: achievement-domain-boundary
description: Achievement hex layers (domain / persistence / application / presentation). Use when editing achievements, badges, feed, impressions, or enum maps.
---

# Achievement domain boundary

`lib/achievements/data/**` is **gone**. Do not create it again. Use:

| Layer | Path | Owns | Forbidden |
|-------|------|------|-----------|
| Domain | `domain/achievement.ts`, `domain/enums.ts`, `domain/feed-event.ts`, `domain/impression.ts` | Zod + parse*; `Achievement` / `Write` / `Create`; impression RPC result and counts | Supabase clients; UI; soft enum defaults |
| Persistence | `persistence/achievements.ts`, `dedications.ts`, `feed.ts`, `impressions.ts` | Supabase I/O; storage Pick/narrow; domain parse at edge | UI; attaching impression counts onto Achievement |
| Application | `application/achievements.ts`, `collection.ts`, `impressions.ts`, `feed.ts`, `dedication-queue.ts`, `ports.ts`, `adapters.ts` | use-cases; ports; compose `listCollection` (achievements + counts) | Port depends on port; raw rows to UI |
| Presentation | `presentation/collection-view-models.ts`, `surface-view-models.ts`, `form-state.ts` | Domain to VM; form to `AchievementWrite`; join counts into VM only | Supabase clients; re-parse trusted enums |
| Client | `client/*` | HTTP body/response Zod | Domain reimplementation of DB rows |
| Components | `components/achievements/*` | iconMap, tone CSS, chrome | DB coerce; soft enum wrappers; `persistence/*`; `Database` types |

## Parse / types

- **Read:** `parseAchievement` / `parseAchievements` -> `Achievement`
- **Write:** `AchievementWrite` / `AchievementCreate`
- **Impressions:** `CreateImpressionResult`, count map via `ImpressionPort.fetchCountMap` -- join in `application/collection.ts` + presentation helpers, never on domain `Achievement`
- **List UI with metrics:** `listCollection` (not pure `listAchievements`)
- **Enums:** `domain/enums.ts` -- closed Zod + `DEFAULT_*` for forms only

## Checklist

1. New closed enum -> `domain/enums.ts` + complete `iconMap` / tone CSS maps.
2. DB/RPC product -> domain schema + parse at persistence edge.
3. Trust domain/VM enums -- `detail.tone`, `iconMap[icon]`.
4. No soft `parse*` / `getSafe*` on trusted domain/VM.
5. Never import `@/lib/achievements/data/**` (path must not exist).
6. `AchievementPort` does not depend on `ImpressionPort`; compose in `collection.ts` only.
7. `pnpm verify` (or targeted unit tests) after boundary edits.

## Examples

```ts
const parsed = parseAchievement(raw);
if (parsed.isErr()) return err(parsed.error);

tone: detail.tone

detailTone: detail?.tone ?? DEFAULT_ACHIEVEMENT_TONE
```

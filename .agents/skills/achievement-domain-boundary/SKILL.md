---
name: achievement-domain-boundary
description: Achievement enums and view-models live at the data boundary. Use when editing achievements, badges, feed rows, domain transformers, or iconMap.
---

# Achievement domain boundary

## Layer table

| Layer | Path | Owns | Forbidden |
|-------|------|------|-----------|
| Enums + hard domain | `achievement-enums.ts`, `achievement-transformers.ts`, feed schemas | Zod enums, `DEFAULT_*`, `tryNormalizeAchievement` | Soft `parse*`, Lucide, Form chrome |
| View-models | `achievement-view-models.ts`, `achievement-surface-view-models.ts` | Domain/trusted feed→VM; form↔payload | Re-parse trusted enum fields |
| UI presentation | `components/achievements/*` | `iconMap`, tone CSS, Form chrome | DB coerce; soft enum wrappers |

## Defaults (single source for write/forms)

| Constant | Value |
|----------|-------|
| `DEFAULT_ACHIEVEMENT_TONE` | `teal` |
| `DEFAULT_ACHIEVEMENT_ICON_KEY` | `trophy` |
| `DEFAULT_ACHIEVEMENT_VISIBILITY` | `public` |
| `DEFAULT_ICON_ASSET_KIND` | `image` |

List invalid rows: skip + Sentry (`reportInvalidAchievementDomainRow`). Single-row paths: `Result.err`.

## Checklist

1. New closed enum → `achievement-enums.ts` + `iconMap` / tone CSS maps.
2. Unknown DB/RPC field → hard Zod schema at edge only.
3. Trust domain/VM enums — `detail.tone`, `iconMap[icon]`.
4. No soft `parse*` / `getSafe*` on domain.
5. `lib/achievements/data/**` must not import from `components/**`.
6. `pnpm verify` after boundary edits.

## Examples

```ts
// edge
const row = tryNormalizeAchievement(raw);
if (row.isErr()) return err(row.error);

// trusted VM
tone: detail.tone

// missing detail shell only
detailTone: detail?.tone ?? DEFAULT_ACHIEVEMENT_TONE
```

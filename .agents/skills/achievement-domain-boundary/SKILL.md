---
name: achievement-domain-boundary
description: Achievement enums and view-models live at the data boundary. Use when editing achievements, badges, feed rows, coerce/transformers, iconMap, or parse* helpers.
---

# Achievement domain boundary

## Layer table

| Layer | Path | Owns | Forbidden |
|-------|------|------|-----------|
| Enums + coerce | `lib/achievements/data/achievement-enums.ts`, `achievement-transformers.ts`, `feed-db.ts` | `parse*`, `DEFAULT_*`; `AchievementDomainRow` | Lucide, Form chrome, CSS tones |
| View-models | `achievement-view-models.ts`, `achievement-surface-view-models.ts` | Domain/trusted feed→VM; form↔payload | Re-parse enum fields on trusted values |
| UI presentation | `components/achievements/*` | `iconMap`, tone CSS, `FormState`, dialog chrome | DB coerce; `getSafe*` aliases; hardcoding default enum strings |

## Defaults (single source)

| Constant | Value |
|----------|-------|
| `DEFAULT_ACHIEVEMENT_TONE` | `teal` |
| `DEFAULT_ACHIEVEMENT_ICON_KEY` | `trophy` |
| `DEFAULT_ACHIEVEMENT_VISIBILITY` | `public` |
| `DEFAULT_ICON_ASSET_KIND` | `image` |

`parse*` returns these constants. Empty dialog shells use the same constants — never literal `"teal"` / `"trophy"` outside `achievement-enums.ts`.

## Checklist

1. New closed enum → `achievement-enums.ts` + `iconMap` / tone CSS maps.
2. Unknown DB/RPC/API field → `parse*` at edge only.
3. Trust domain/VM enums — `detail.tone`, `iconMap[icon]`.
4. No `getSafe*` wrappers around `parse*`.
5. `lib/achievements/data/**` must not import enum parse from `components/**`.
6. `pnpm verify` after boundary edits.

## Examples

```ts
// edge
tone: parseTone(row.tone as string | null | undefined)

// trusted VM
tone: detail.tone
FallbackIcon: iconMap[row.icon]

// missing detail shell only
detailTone: detail?.tone ?? DEFAULT_ACHIEVEMENT_TONE
```

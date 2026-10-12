# Live badge canvas fills the slot

Status: Accepted
Date: 2026-10-12

## Context

A 3D badge on iPhone stayed on the static poster and ignored every touch. Desktop was fine. GPU hints, a lighter environment map, and waiting until the badge was “visible” did not change that.

The badge frame (`BadgeSlot`) is a flex square. Its height comes from `aspect-ratio` and width, not from its children. Safari does not resolve `height: 100%` on an in-flow child of that square. The poster is taken out of flow (`absolute`), so it still painted. The WebGL canvas stayed in flow, collapsed to an empty box, never presented a frame, and had nothing to drag.

Two more conditions produce the same dead poster, because the poster sits on top with `pointer-events: none` until the model reports ready:

- The canvas is created while its own opacity is `0`. Safari allocates the context and then never presents it, including after opacity returns.
- The model and the studio HDR share one Suspense boundary. The HDR suspends the mesh. If that image never finishes, the poster never leaves.

There is no automated check for this. A desktop pass will not catch a regression.

## Decision

The live canvas must occupy the slot’s own box, and nothing in the load path may keep that canvas from mounting or presenting.

1. `BadgeSlot` wraps its children in `absolute inset-0`. Do not size the live badge by `h-full` / `height: 100%` in normal flow inside the aspect-ratio frame.
2. The canvas element is `position: absolute; inset: 0` in that same box. It stays at full opacity while the context is created. The poster covers it until the model is ready; the canvas itself is not the thing faded in.
3. Studio HDR (`Environment`) loads beside the model, in its own Suspense boundary and error boundary. A slow or failed environment must not suspend `BadgeModelContent`.

Device-specific renderer flags are not a substitute for this layout.

## Consequences

- Changing the slot, the canvas style, the poster overlay, or the environment boundary requires checking these three points on an iPhone, not only on desktop.
- Reintroducing an in-flow percentage height, `opacity: 0` on the canvas before the first presented frame, or a shared Suspense around the model and the HDR brings back a blank, uninteractive badge on iPhone without breaking desktop.

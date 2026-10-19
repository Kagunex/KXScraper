# KXScraper Website Design System

## Direction

Neo-brutalist developer tooling: charcoal canvas, warm-white type, electric-lime emphasis, hard borders, and selective offset shadows. Editorial sections alternate between full-width bands, code-led layouts, provider rows, and compact capability sequences. Keep product claims factual and preserve `anime-sdk` wherever it names the published package.

## Tokens

Core tokens live in `src/styles/base.css`:

```css
--bg: #111310;
--panel: #191c17;
--panel-raised: #22261f;
--ink: #f3f3e9;
--muted: #a4aa9b;
--subtle: #73796c;
--border: #484d3f;
--lime: #c6ff4a;
--danger: #ff715b;
```

Use tokens for UI color. Provider method and language labels use the same base palette; reserve additional colors for actual status meaning.

## Type and layout

- **Inter** carries interface and editorial text.
- **JetBrains Mono** marks code, endpoints, indexes, and technical labels.
- Use `.section-head`, `.section-head-split`, and `.section-heading` to establish section hierarchy.
- `.frame` sets the site width; `.hline`, `.cell`, and `.provider-row` provide structure with firm borders.
- Mobile breakpoints are 800px and 600px. At narrow widths, collapse multi-column examples and keep code blocks horizontally scrollable.
- Buttons use `.action` / `.action-secondary`; focus indicators are global and must remain visible.

## Icons

Use `@lucide/astro` for UI icons. Keep icons at 12–19px in navigation and labels, around 19px in feature glyphs, and use `aria-hidden="true"` when nearby text already names the action. Icon-only controls need an accessible label. Do not add emoji or a second icon library.

## Motion and WebGL

The hero's Three.js island is hydrated with `client:visible`, caps pixel ratio more aggressively on small screens, pauses when off-screen or the document is hidden, and renders one frame for reduced-motion users. Dispose scene resources on unmount. Any new reveal or hover motion must respect `prefers-reduced-motion` and keep content visible when JavaScript is unavailable.

## Code examples and demos

Code examples use hand-authored syntax spans in `.kw`, `.str`, `.fn`, `.typ`, `.num`, `.prop`, `.cm`, and `.pun`. Keep package imports and install commands as `anime-sdk` while that remains the published package identifier. Demo copy controls should copy the exact shown sample and announce their state.

## Accessibility

- Use semantic headings, navigation landmarks, and lists for ordered workflows.
- Provide visible focus states and accessible names for icon-only links and buttons.
- Keep contrast at or above the warm-white/muted and lime/charcoal combinations in the core palette.
- Decorative WebGL and icons use `aria-hidden`; the page message remains complete without them.

## File map

- Tokens and base elements: `src/styles/base.css`
- Landing and reusable page components: `src/styles/components.css`
- Starlight documentation theme: `src/styles/starlight.css`
- Landing sections: `src/components/sections/*.astro`
- Hero WebGL scene: `src/components/islands/HeroBackground.tsx`
- Page shell and metadata: `src/layouts/Layout.astro`

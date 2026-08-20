<!-- Phase: Branding exploration after Phase 17 -->

# Vulci brand specification

> Status: accepted starter specification. This document is authoritative for
> Vulci product branding; it does not define the Vulci language.

## Core rule

`brand-rule01` — Preserve the supplied Version 23 symbol exactly. Supporting assets may crop transparent padding, resize it proportionally, and place it on approved backgrounds, but must not redraw or reshape it.

## Logo assets

- `logo01` — `branding/logo.svg` is the current scalable working asset. It is a
  reconstruction of the supplied Version 23 symbol, not a replacement for the
  original vector artwork.
- `logo02` — `branding/logo.png` is the current raster logo asset.
- `logo03` — The supplied Version 23 artwork remains the visual authority if a
  generated asset differs from it.

## Palette

- `color01` — Ink: `#0E0B14`
- `color02` — Paper: `#FAF8FC`
- `color03` — Violet: `#8039DF`
- `color04` — Deep violet: `#672AB3`
- `color05` — Magenta: `#E748AE`
- `color06` — Deep magenta: `#D137B0`

The violet and magenta anchors were sampled from the supplied PNG. The logo itself remains the authoritative gradient artwork; these tokens are supporting UI colours, not replacements for the logo gradient.

## Typography

- `type01` — Display and headings: Inter Display SemiBold.
- `type02` — Body: Inter Regular.
- `type03` — Code and `.vci` labels: a neutral monospace font.

Inter is the accepted working typeface for branded assets. Product interfaces
may use their native UI font where loading Inter would add unnecessary weight.

## Applications

- `use01` — GitHub README hero: use the responsive
  `branding/vulci-readme-hero-dark.png` and
  `branding/vulci-readme-hero-light.png` pair.
- `use02` — GitHub social preview: use
  `branding/vulci-github-social-preview.png`.
- `use03` — Repository, organisation, social, and package avatars: derive
  future square assets from the symbol without reshaping it.
- `use04` — Documentation and future website headers: use the matching
  `branding/vulci-readme-banner-dark.png` or
  `branding/vulci-readme-banner-light.png` as a starting point.
- `use05` — Browser favicon and bookmark icon: derive a future compact asset
  from the symbol.
- `use06` — `.vci` editor or marketplace artwork: derive a future file icon
  from the symbol.
- `use07` — Homebrew and release notes: use the symbol or a compact horizontal
  lockup on an approved background.
- `use08` — CLI help or a future REPL splash: use the restrained ANSI treatment
  below; do not print a large logo during normal execution.
- `use09` — Slides, social posts, and documentation covers: if the symbol is
  used as a pattern, keep it as a low-opacity background.

## Terminal treatment

- `terminal01` — Render `Vulci` on the first line of help as a five-step
  violet-to-pink gradient: `V` `#A05AF7`, `u` `#B55BE4`, `l` `#CA5BD2`, `c`
  `#DF5CBF`, and `i` `#F45CAC`.
- `terminal02` — Render section headings in bold violet `#A05AF7`.
- `terminal03` — Render option names in bold pink `#F45CAC`.
- `terminal04` — Keep spacing, wording, and other content identical when colour
  is disabled. Respect non-colour output, `NO_COLOR`, and the CLI's
  `--no-color` behaviour.
- `terminal05` — The heading violet may also identify named diagnostic sections
  such as `Tokens` and `AST`.

## Important limits

- `limit01` — Do not put the full logo into every CLI invocation; that harms speed and readability.
- `limit02` — Do not repeat the logo as a strong decorative pattern. Keep any
  such pattern below 4% opacity.
- `limit03` — Do not introduce a mascot yet. The symbol is distinctive enough; a mascot would split recognition before the core identity is established.
- `limit04` — Use the real SVG as the eventual master once it can be added. This kit derives from the uploaded PNG and should not replace the original vector source.

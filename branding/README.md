<!-- Phase: Branding exploration after Phase 17 -->

# Vulci starter brand kit

> Status: proposal only. This is not a source-of-truth branding document and does not change the Vulci repository.

## Core rule

`brand-rule01` — Preserve the supplied Version 23 symbol exactly. Supporting assets may crop transparent padding, resize it proportionally, and place it on approved backgrounds, but must not redraw or reshape it.

## Proposed palette

- `color01` — Ink: `#0E0B14`
- `color02` — Paper: `#FAF8FC`
- `color03` — Violet: `#8039DF`
- `color04` — Deep violet: `#672AB3`
- `color05` — Magenta: `#E748AE`
- `color06` — Deep magenta: `#D137B0`

The violet and magenta anchors were sampled from the supplied PNG. The logo itself remains the authoritative gradient artwork; these tokens are supporting UI colours, not replacements for the logo gradient.

## Proposed typography

- `type01` — Display and headings: Inter Display SemiBold.
- `type02` — Body: Inter Regular.
- `type03` — Code and `.vci` labels: a neutral monospace font.

Typography remains undecided. The included banners use Inter only as a working prototype.

## Recommended uses

- `use01` — GitHub README hero: `banners/vulci-readme-banner-dark.png`.
- `use02` — GitHub social preview: `banners/vulci-github-social-preview.png`.
- `use03` — Repository, organisation, social, and package avatar: square icons under `icons/`.
- `use04` — Documentation and future website header: horizontal lockups under `lockups/`.
- `use05` — Browser favicon and bookmark icon: `icons/favicon.ico`.
- `use06` — `.vci` editor or marketplace artwork: `icons/vulci-vci-file-icon.png`.
- `use07` — Homebrew tap and release notes: compact dark-background icon or horizontal lockup.
- `use08` — CLI help or future REPL splash: restrained ANSI wordmark in `terminal/terminal-wordmark.txt`; do not print a large logo during normal execution.
- `use09` — Slides, social posts, and documentation covers: use the supplied pattern only as a low-opacity background.

## Important limits

- `limit01` — Do not put the full logo into every CLI invocation; that harms speed and readability.
- `limit02` — Do not repeat the logo as a strong decorative pattern. The included pattern is intentionally below 4% opacity.
- `limit03` — Do not introduce a mascot yet. The symbol is distinctive enough; a mascot would split recognition before the core identity is established.
- `limit04` — Use the real SVG as the eventual master once it can be added. This kit derives from the uploaded PNG and should not replace the original vector source.

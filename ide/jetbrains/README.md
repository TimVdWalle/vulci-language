<!-- Phase: Post-Phase 18 editor support refresh -->

<p align="center">
  <img src="../../branding/logo.svg" alt="Vulci logo" width="180">
</p>

<h1 align="center">Vulci support for JetBrains IDEs</h1>

<p align="center">
  Lightweight syntax highlighting for <code>.vci</code> files.
</p>

In WebStorm, open **Settings → Editor → TextMate Bundles**, click **Add**, and
select the `Vulci.tmbundle` folder beside this file. The bundle recognizes `.vci`
files.

The grammar covers implemented Vulci syntax through Phase 18. It uses
JetBrains-compatible TextMate scope families for declarations, types, constants,
variables, function and member calls, operators, control flow, loops, comments,
and strings. Double-quoted strings highlight `{{expression}}` interpolation;
interpolation-looking text in single-quoted strings remains literal.

Local variables, `$` globals, scalar types, and collection types use distinct
JetBrains-compatible scope families so colour schemes can style each category
separately.

The active IDE colour scheme chooses the exact colours. The bundle deliberately
does not contain theme-specific colour overrides. `info.plist` registers the
bundle; the highlighting grammar is in `Syntaxes/Vulci.tmLanguage`.

After replacing or updating the bundle, remove the old WebStorm TextMate entry
and add this folder again. This avoids a stale cached registration.

Open `examples/syntax_coloring.vci` to review every major scope together.

## Vulci file icon

The optional `VulciFileIcon` companion plugin displays the Vulci logo for `.vci`
files while this TextMate bundle continues to provide highlighting. Run its
`build.sh`, then install the generated ZIP through **Settings → Plugins → Install
Plugin from Disk** and restart the IDE.

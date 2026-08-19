<!-- Phase: Branding exploration after Phase 17 -->

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

It exposes separate theme-controlled scopes for local variables, `$` global
variables, logical operators, flow keywords, structs, and enums. Double-quoted
strings highlight `{{expression}}` interpolation. Interpolation-looking text in
single-quoted strings remains literal by design.

After replacing or updating the bundle, remove the old WebStorm TextMate entry
and add this folder again. This avoids a stale cached registration.

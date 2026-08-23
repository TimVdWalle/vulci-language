<!-- Phase: Post-Phase 18 editor support refresh -->

# Vulci File Icon

This icon-only companion plugin shows the Vulci logo for `.vci` files in
JetBrains IDEs. It does not provide language parsing or highlighting; keep the
repository's `Vulci.tmbundle` enabled for syntax support.

## Build

Run:

```shell
./build.sh
```

The script compiles against `/Applications/WebStorm.app` and writes the
installable ZIP to `build/distributions/`. Set `VULCI_WEBSTORM_APP` to another
JetBrains application path when necessary.

## Install

In WebStorm, open **Settings → Plugins**, choose **Install Plugin from Disk**,
select the generated ZIP, and restart the IDE.

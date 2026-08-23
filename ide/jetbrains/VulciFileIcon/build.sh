#!/bin/sh
# Phase: Post-Phase 18 editor support refresh

set -eu

plugin_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
webstorm_app=${VULCI_WEBSTORM_APP:-/Applications/WebStorm.app}
jbr_bin="$webstorm_app/Contents/jbr/Contents/Home/bin"
core_jar="$webstorm_app/Contents/lib/intellij.platform.core.jar"
ui_jar="$webstorm_app/Contents/lib/intellij.platform.util.ui.jar"
annotations_jar="$webstorm_app/Contents/lib/annotations.jar"
util_jar="$webstorm_app/Contents/lib/util-8.jar"
output_dir="$plugin_dir/build/distributions"
output_zip="$output_dir/vulci-file-icon-0.1.0.zip"
build_root=$(mktemp -d /private/tmp/vulci-file-icon.XXXXXX)

cleanup() {
    rm -rf -- "$build_root"
}

trap cleanup EXIT HUP INT TERM

for required_file in "$jbr_bin/javac" "$core_jar" "$ui_jar" "$annotations_jar" "$util_jar"; do
    if [ ! -f "$required_file" ]; then
        echo "Missing WebStorm build dependency: $required_file" >&2
        exit 1
    fi
done

classes_dir="$build_root/classes"
jar_root="$build_root/jar"
package_root="$build_root/package"
plugin_root="$package_root/VulciFileIcon"
plugin_jar="$plugin_root/lib/vulci-file-icon.jar"

mkdir -p "$classes_dir" "$jar_root" "$plugin_root/lib" "$output_dir"

"$jbr_bin/javac" \
    --release 21 \
    -classpath "$core_jar:$ui_jar:$annotations_jar:$util_jar" \
    -d "$classes_dir" \
    "$plugin_dir/src/main/java/dev/vulci/jetbrains/icon/VulciFileIconProvider.java"

cp -R "$classes_dir/." "$jar_root/"
cp -R "$plugin_dir/src/main/resources/." "$jar_root/"

(cd "$jar_root" && zip -q -r "$plugin_jar" .)
rm -f -- "$output_zip"
(cd "$package_root" && zip -q -r "$output_zip" VulciFileIcon)

echo "$output_zip"

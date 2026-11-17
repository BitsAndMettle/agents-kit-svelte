#!/usr/bin/env bash
# Rebuilds the woff2 files in src/lib/fonts from the fonts' official GitHub releases.
# The outputs are committed; run this only to move to a new font release.
#
#   pip install fonttools brotli   (fontTools 4.68.0 built the committed files)
#   bash scripts/build-fonts.sh
#
# Each release zip is checked against the sha256 pinned below. When you bump a release, pin the
# new sha256 only after checking the files inside match the blobs in the project's tagged git
# tree (`git hash-object <file>` against `gh api repos/<repo>/git/trees/<tag>?recursive=1`).
set -euo pipefail

INTER_URL=https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
INTER_SHA256=9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e
MONO_URL=https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip
MONO_SHA256=6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf

# Google Fonts' latin and latin-ext ranges. Latin also takes the arrows and keyboard keys (⌘ ⌥ ⇧ ↵)
# the components draw. These must match the unicode-range lines in fonts.css.
LATIN='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+2300-23FF,U+FEFF,U+FFFD'
LATIN_EXT='U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

out="$(cd "$(dirname "$0")/.." && pwd)/src/lib/fonts"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fetch() { # url sha256 -> extracted dir
	curl -fsSL -o "$work/src.zip" "$1"
	echo "$2  $work/src.zip" | sha256sum -c --quiet
	rm -rf "$work/x" && unzip -q "$work/src.zip" -d "$work/x" && rm "$work/src.zip"
}

subset() { # source name
	for range in latin latin-ext; do
		local unicodes=$LATIN
		[ "$range" = latin-ext ] && unicodes=$LATIN_EXT
		python3 -m fontTools.subset "$1" --unicodes="$unicodes" --layout-features='*' --name-IDs='*' \
			--flavor=woff2 --output-file="$out/$2-$range.woff2"
	done
}

fetch "$INTER_URL" "$INTER_SHA256"
subset "$work/x/web/InterVariable.woff2" inter
cp "$work/x/LICENSE.txt" "$out/Inter-OFL.txt"

fetch "$MONO_URL" "$MONO_SHA256"
subset "$work/x/fonts/variable/JetBrainsMono[wght].ttf" jetbrains-mono
cp "$work/x/OFL.txt" "$out/JetBrainsMono-OFL.txt"

ls -l "$out"

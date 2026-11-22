#!/bin/bash
cd "$(dirname "$0")"
SRC="$PWD/EffectsLite"
DST="$HOME/Library/Application Support/Adobe/CEP/extensions/EffectsLite"
[ -f "$SRC/CSXS/manifest.xml" ] || { echo "Cannot find the EffectsLite folder next to this script."; exit 1; }
echo "Installing to $DST"
mkdir -p "$(dirname "$DST")"
rm -rf "$DST"
cp -R "$SRC" "$DST" || exit 1
for v in 9 10 11 12; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
echo
echo "Done. Restart After Effects, then open Window > Extensions > EffectsLite."

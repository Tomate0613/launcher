#! /usr/bin/env nix
#! nix shell nixpkgs#bash nixpkgs#imagemagick nixpkgs#libicns --command bash

magick assets/icon_wip.png -filter point -resize '512x512<' assets/icon.png
cp assets/icon.png build/icon.png
magick assets/icon.png build/icon.ico
png2icns build/icon.icns assets/icon.png

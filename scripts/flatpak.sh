#! /usr/bin/env bash

pnpm build:linux --linux flatpak || exit 1
flatpak install --user 'dist/Tomate Launcher-1.0.0-x86_64.flatpak' || exit 1

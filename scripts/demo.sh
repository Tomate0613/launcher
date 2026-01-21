#! /usr/bin/env bash

pnpm build:linux --linux flatpak || exit 1
sudo flatpak install 'dist/Tomate Launcher-1.0.0-x86_64.flatpak' || exit 1
labwc -S "flatpak run dev.doublekekse.launcher" || echo LabWC not installed


#! /usr/bin/env node

import { execSync } from "node:child_process";

if (!process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
  execSync("install-electron", { stdio: "inherit" });
}

execSync("electron-builder install-app-deps", { stdio: "inherit" });

#!/usr/bin/env -S nix shell nixpkgs#bash nixpkgs#smem --command bash

get_children() {
  local pid=$1
  printf "%s|" "$pid"
  for child in $(pgrep -P "$pid"); do
    get_children "$child"
  done
}

# This is specific to how we package with nix
ROOT_PID=${1:-$(pgrep -fo '[e]lectron.*TomateLauncher/app.asar')}
PIDS=$(get_children "$ROOT_PID" | sed 's/|$//')

smem -c "pid pss" | grep -E "$PIDS" | awk '{sum+=$2} END {print sum/1024 " MB"}'

{
  pkgs,
  pkgsOld,
  lib,
  mc-wrapper,
  runtimeLibs,
  jdks ? with pkgs; [ jdk21 jdk25 ],
}:
let
  pname = (lib.fromJSON (lib.readFile ./package.json)).name;
  desktopItem = pkgs.makeDesktopItem {
    name = pname;
    exec = "${pname} %U";
    desktopName = "Tomate Launcher";
    icon = "dev.doublekekse.launcher";
    categories = [ "Game" ];
    mimeTypes = [ "x-scheme-handler/tomate-launcher" ];
  };
in
pkgs.mkPnpmPackage {
  inherit pname;
  version = (lib.fromJSON (lib.readFile ./package.json)).version;

  src = ./.;
  lockFile = ./pnpm-lock.yaml;

  nativeBuildInputs = with pkgs; [
    nodejs
    pkgsOld.pnpm
    makeWrapper
  ];

  buildCommand = "build:linux";

  buildDependencies = [
    "@doublekekse/find-java"
    "tomate-launcher-core"
    "tomate-mods"
    "tomate-loaders"
  ];

  outDir = "dist";

  preBuild =
    lib.optionalString pkgs.stdenv.hostPlatform.isDarwin ''
      cp -r ${pkgs.electron.dist}/Electron.app .
      chmod -R u+w Electron.app
    ''
    + lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
      cp -r ${pkgs.electron.dist} electron-dist
      chmod -R u+w electron-dist
    '';

  buildPhase = ''
    runHook preBuild

    pnpm build
    pnpm exec electron-builder \
      --dir \
      -c.electronDist=${if pkgs.stdenv.hostPlatform.isDarwin then "." else "electron-dist"} \
      -c.electronVersion=${pkgs.electron.version}

    runHook postBuild
  '';

  installPhase = ''
    mkdir -p $out/opt
    mv dist/*unpacked/resources $out/opt/TomateLauncher

    mkdir -p $out/share/applications
    cp ${desktopItem}/share/applications/* $out/share/applications

    mkdir -p $out/share/icons/hicolor/512x512/apps
    cp assets/icon.png $out/share/icons/hicolor/512x512/apps/dev.doublekekse.launcher.png
  '';

  postFixup = lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
    makeWrapper ${pkgs.electron}/bin/electron $out/bin/tomate-launcher \
      --add-flags $out/opt/TomateLauncher/app.asar \
      --add-flags "\''${NIXOS_OZONE_WL:+\''${WAYLAND_DISPLAY:+--ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime=true}}" \
      --set MC_WRAPPER_PATH ${mc-wrapper}/bin/${mc-wrapper.pname} \
      --set LD_LIBRARY_PATH ${pkgs.addDriverRunpath.driverLink}/lib:${lib.makeLibraryPath (runtimeLibs pkgs)} \
      --set TOMATE_LAUNCHER_JDKS ${lib.makeBinPath jdks}
      --set ELECTRON_FORCE_IS_PACKAGED=1
  '';
}

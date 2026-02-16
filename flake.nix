{
  description = "Tomate Launcher";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    pnpm2nix.url = "github:Tomate0613/nix-flakes/pnpm";
  };

  outputs =
    { nixpkgs, pnpm2nix, ... }@inputs:

    let
      inherit (nixpkgs) lib;
      systems = lib.systems.flakeExposed;

      forAllSystems = lib.genAttrs systems;
      nixpkgsFor = forAllSystems (system: nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgsFor.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs
              pnpm
              jdk21

              pciutils
              xorg.xrandr
              mesa-demos

              wineWowPackages.minimal
              flatpak-builder
            ];

            __GL_THREADED_OPTIMIZATIONS = 0;
            LD_LIBRARY_PATH = lib.makeLibraryPath (
              with pkgs;
              [
                glib
                libgbm
                glibc
                nss
                nspr
                dbus
                alsa-lib
                atk
                cups
                gtk3
                pango
                cairo
                libx11
                libxcomposite
                libxdamage
                libxext
                libxfixes
                libxrandr
                libxrender
                libxcb
                expat
                at-spi2-atk
                libxkbcommon
                mesa
                libGL

                (lib.getLib stdenv.cc.cc)
                ## native versions
                glfw3-minecraft
                openal

                ## openal
                alsa-lib
                libjack2
                libpulseaudio
                pipewire

                ## glfw
                libGL
                libx11
                libxcursor
                libxext
                libxrandr
                libxxf86vm

                flite # Text to speech (Otherwise minecraft will log an error every time it launches)

                udev # oshi

                vulkan-loader # VulkanMod's lwjgl

                ocl-icd # OpenCL for c2me

                gamemode
              ]
            );
          };
        }

      );

      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ pnpm2nix.overlays.default ];
          };
          lib = pkgs.lib;
        in
        {
          default = pkgs.mkPnpmPackage {
            pname = (lib.fromJSON (lib.readFile ./package.json)).name;
            version = (lib.fromJSON (lib.readFile ./package.json)).version;

            src = ./.;
            lockFile = ./pnpm-lock.yaml;

            nativeBuildInputs = with pkgs; [
              nodejs
              pnpm
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
            '';

            postFixup = lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
              makeWrapper ${pkgs.electron}/bin/electron $out/bin/tomate-launcher \
                --add-flags $out/opt/TomateLauncher/app.asar \
                --add-flags "\''${NIXOS_OZONE_WL:+\''${WAYLAND_DISPLAY:+--ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime=true}}"
            '';
          };
        }
      );
    };
}

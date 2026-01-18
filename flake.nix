{
  description = "Tomate Launcher";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:

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
                xorg.libX11
                xorg.libXcomposite
                xorg.libXdamage
                xorg.libXext
                xorg.libXfixes
                xorg.libXrandr
                xorg.libxcb
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
                xorg.libX11
                xorg.libXcursor
                xorg.libXext
                xorg.libXrandr
                xorg.libXxf86vm

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
    };
}

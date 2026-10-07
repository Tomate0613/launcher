{
  description = "Tomate Launcher";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    nixpkgs-old.url = "github:nixos/nixpkgs/eaad089433ca2bb662274377d33df3d0e51ef28b";
    pnpm2nix.url = "github:Tomate0613/nix-flakes/pnpm";
  };

  outputs =
    {
      nixpkgs,
      nixpkgs-old,
      pnpm2nix,
      self,
    }:

    let
      inherit (nixpkgs) lib;
      systems = lib.systems.flakeExposed;

      forAllSystems = lib.genAttrs systems;

      nixpkgsFor = forAllSystems (system: nixpkgs.legacyPackages.${system});
      nixpkgsOldFor = forAllSystems (system: nixpkgs-old.legacyPackages.${system});

      runtimeLibs =
        pkgs: with pkgs; [
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
          libdecor

          flite # Text to speech (Otherwise minecraft will log an error every time it launches)

          udev # oshi

          vulkan-loader # VulkanMod's lwjgl

          ocl-icd # OpenCL for c2me

          gamemode
        ];
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
              bubblewrap
              xdg-dbus-proxy

              pciutils
              xrandr
              mesa-demos
            ];

            buildInputs = with pkgs; [
              pkg-config
              gtk4
              json-glib

              (libseccomp.overrideAttrs (old: {
                dontDisableStatic = true;
                doCheck = false;
              }))
            ];

            env = {
              TOMATE_LAUNCHER_JDKS = lib.makeBinPath (
                with pkgs;
                [
                  jdk21
                  jdk25
                ]
              );

              __GL_THREADED_OPTIMIZATIONS = 0;
              LD_LIBRARY_PATH = "${pkgs.addDriverRunpath.driverLink}/lib:${lib.makeLibraryPath (runtimeLibs pkgs)}";
              LIBSECCOMP_LIB_PATH = lib.makeLibraryPath (
                with pkgs;
                [
                  (libseccomp.overrideAttrs (old: {
                    dontDisableStatic = true;
                    doCheck = false;
                  }))
                ]
              );
            };
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
          pkgsOld = nixpkgsOldFor.${system};
        in
        {
          default = pkgs.callPackage ./launcher.nix {
            inherit
              runtimeLibs
              pkgsOld
              ;

            mc-wrapper = self.packages.${system}.mc-wrapper;

            electron = pkgs.electron_44;

            jdks = with pkgs; [
              jdk21
              jdk25
            ];
          };

          mc-wrapper =
            let
              cargoToml = lib.fromTOML (lib.readFile ./mc-wrapper/Cargo.toml);
            in
            pkgs.rustPlatform.buildRustPackage (finalAttrs: {
              pname = cargoToml.package.name;
              version = cargoToml.package.version;

              nativeBuildInputs = with pkgs; [
                pkg-config
              ];

              buildInputs = with pkgs; [
                dbus
                libseccomp
              ];

              src = ./mc-wrapper;

              cargoLock = {
                lockFile = ./mc-wrapper/Cargo.lock;

                outputHashes = {
                  "command-5.3.1" = "sha256-h/YZtevYWpXI5HC3FBHXt4dizm0tNcf1f+zIngWMzWQ=";
                };
              };
            });
        }
      );

      overlays.default = final: prev: {
        tomate-launcher = self.packages.${final.stdenv.hostPlatform.system}.default;
      };
    };
}

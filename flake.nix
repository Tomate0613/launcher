{
  description = "Tomate Launcher";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    pnpm2nix.url = "github:Tomate0613/nix-flakes/pnpm";
  };

  outputs =
    {
      nixpkgs,
      pnpm2nix,
      self,
    }:

    let
      inherit (nixpkgs) lib;
      systems = lib.systems.flakeExposed;

      forAllSystems = lib.genAttrs systems;

      nixpkgsFor = forAllSystems (system: nixpkgs.legacyPackages.${system});

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
              LD_LIBRARY_PATH = lib.makeLibraryPath (runtimeLibs pkgs);

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
        in
        {
          default = pkgs.callPackage ./launcher.nix {
            inherit
              runtimeLibs
              ;
            mc-wrapper = self.packages.${system}.mc-wrapper;
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
                  "command-5.2.2" = "sha256-nCC06XdZrcwK9blnB4sbDLHcSk6ce+yUf7lqC9+iBiA=";
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

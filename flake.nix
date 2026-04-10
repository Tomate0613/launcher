{
  description = "Tomate Launcher";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    nixpkgsOld.url = "github:nixos/nixpkgs/nixos-unstable";
    pnpm2nix.url = "github:Tomate0613/nix-flakes/pnpm";
  };

  outputs =
    {
      nixpkgs,
      nixpkgsOld,
      pnpm2nix,
      self,
    }:

    let
      inherit (nixpkgs) lib;
      systems = lib.systems.flakeExposed;

      forAllSystems = lib.genAttrs systems;

      nixpkgsFor = forAllSystems (system: nixpkgs.legacyPackages.${system});
      nixpkgsOldFor = forAllSystems (system: nixpkgsOld.legacyPackages.${system});

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
              jdk21
              jdk25

              pciutils
              xrandr
              mesa-demos

              wineWow64Packages.minimal
              flatpak-builder
            ];

            env = {
              PKG_CONFIG_PATH = "${pkgs.gtk4}/lib/pkgconfig:${pkgs.json-glib}/lib/pkgconfig";
              MC_WRAPPER_PATH = "${self.packages.${system}.mc-wrapper}/bin/${
                self.packages.${system}.mc-wrapper.pname
              }";
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
                ]
                ++ (runtimeLibs pkgs)
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
          pkgsOld = nixpkgsOldFor.${system};
          lib = pkgs.lib;
        in
        {
          default = pkgs.callPackage ./launcher.nix {
            inherit
              pkgsOld
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
              ];

              src = ./mc-wrapper;

              cargoLock = {
                lockFile = ./mc-wrapper/Cargo.lock;
              };
            });

          tray-test =
            let
              cargoToml = lib.fromTOML (lib.readFile ./tray-test/Cargo.toml);
            in
            pkgs.rustPlatform.buildRustPackage (finalAttrs: {
              pname = cargoToml.package.name;
              version = cargoToml.package.version;

              nativeBuildInputs = with pkgs; [
                pkg-config
              ];

              buildInputs = with pkgs; [
                dbus
              ];

              src = ./tray-test;

              cargoLock = {
                lockFile = ./tray-test/Cargo.lock;
              };
            });
        }
      );

      overlays.default = final: prev: {
        tomate-launcher = self.packages.${final.stdenv.hostPlatform.system}.default;
      };
    };
}

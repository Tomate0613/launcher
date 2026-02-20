# CLI

## List Modpacks
List all modpacks with their ids
```
tomate-launcher list-modpacks
```

## Launch
Launch a modpack
```
tomate-launcher launch <modpack-id>
```

## Create Modpack
Create a modpack
```
tomate-launcher create-modpack <name> <loader> <game-version>
```

Additionally mods can be installed using
- `--file <filepath>`
- `--mr <modrinth_project>`
- `--cf <curseforge_project>` (if [curseforge support](./curseforge.md) is enabled)

## Quick Launch
Launch the game using a temporary modpack deleted on exit
```
tomate-launcher quick-launch <loader> <game-version>
```
See section above for specifying which mods to install


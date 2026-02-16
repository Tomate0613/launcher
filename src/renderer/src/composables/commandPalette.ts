import { ref } from 'vue';
import { ContentType } from '../../../main/data/content/content';

type CommandPalette = {
  setModpackIconFromContentType(
    modpackId: string,
    contentType: ContentType,
  ): void;
};
const commandPaletteRef = ref<CommandPalette | null>(null);

export function setCommandPaletteInstance(instance: CommandPalette) {
  commandPaletteRef.value = instance;
}

export function useCommandPalette() {
  return commandPaletteRef;
}

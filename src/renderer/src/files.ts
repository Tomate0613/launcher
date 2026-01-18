import { log } from '../../common/logging/log';

const logger = log('files');

export function forEachDroppedFile(
  event: DragEvent,
  callback: (name: string, buffer: ArrayBuffer) => void,
) {
  const files = event.dataTransfer?.files;
  if (!files) {
    return;
  }

  forEachFile(files, callback);
}

export function forEachInputtedFile(
  element: HTMLInputElement | null | undefined,
  callback: (name: string, buffer: ArrayBuffer) => void,
) {
  const files = element?.files;
  if (!files) {
    logger.log('no files');
    return;
  }

  logger.log(files.length);
  forEachFile(files, callback);
  logger.log(files);
}

export function forEachFile(
  files: FileList,
  callback: (name: string, buffer: ArrayBuffer) => void,
) {
  for (let i = 0; i < files.length; i++) {
    const file = files.item(i);

    if (!file) {
      logger.log(file, 'is not there', i);
      continue;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      callback(file.name, buffer);
    };
    reader.readAsArrayBuffer(file);
  }
}

import EventEmitter from 'node:events';
import { Logger } from '../common/logging/log';

export type Process = {
  id: string;
  progress: number;
  cleanUp: () => void;
  blocking: boolean;
};

export type Processor = {
  logger: Logger;
  processes: Process[];

  invalidate(): void;
};

type ProcessEvents = {
  progress: [number];

  done: [];
  cancel: [];

  stop: [];
};

export class ProcessContext extends EventEmitter<ProcessEvents> {
  progress(progress: number) {
    this.emit('progress', progress);
  }

  done() {
    this.emit('done');
    this.emit('stop');
  }

  cancel() {
    this.emit('cancel');
    this.emit('stop');
  }
}

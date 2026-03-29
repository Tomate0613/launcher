import EventEmitter from 'node:events';
import { Logger } from '../common/logging/log';

let processes: ProcessContext[] = [];

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
  private stopped = false;

  constructor() {
    super();

    processes.push(this);
    this.on('stop', () => {
      processes = processes.filter((process) => process !== this);
      this.stopped = true;
    });
  }

  progress(progress: number) {
    this.emit('progress', progress);
  }

  private stop() {
    if (this.stopped) return;

    this.stopped = true;
    this.emit('stop');
  }

  done() {
    this.emit('done');
    this.stop();
  }

  cancel() {
    this.emit('cancel');
    this.stop();
  }

  wait() {
    if (this.stopped) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.once('stop', resolve);
    });
  }
}

export function getAllProcesses() {
  return processes;
}

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

export class ProcessContext {
  constructor(
    private processor: Processor,
    private id: string,
    private cleanUp: () => void,
  ) {}

  progress(progress: number) {
    const process = this.processor.processes.find((p) => p.id === this.id);
    if (process) {
      process.progress = progress;
    }

    this.processor.invalidate();
  }
  stop() {
    this.processor.processes = this.processor.processes.filter(
      (progress) => progress.id !== this.id,
    );
    this.processor.logger.log('Stopped process', this.id);
    this.processor.invalidate();
  }
  cancel() {
    this.cleanUp();
    this.stop();
  }
}

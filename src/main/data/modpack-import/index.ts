import { LoaderId } from 'tomate-loaders';
import { Modpack } from '../modpack';

export type LoaderInfo = { id: LoaderId; version: string };
export type ProgressListener = (percent: number) => void;

export type ModpackImporter = {
  get name(): string;
  get minecraftVersion(): string;
  get loader(): LoaderInfo;

  downloadFiles(modpack: Modpack, onProgress: ProgressListener): Promise<void>;
  overrideAdditionalFiles(directory: string): Promise<void>;
} & Partial<OptionalData>;

type OptionalData = {
  get description(): string;
  get overrides(): string;
  get version(): string;
};

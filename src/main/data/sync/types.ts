type ExternalSync = {
  type: 'external';
  command?: string;
};

type UnsupSync = {
  type: 'unsup';
};

export type InstanceSyncOptions = ExternalSync | UnsupSync;

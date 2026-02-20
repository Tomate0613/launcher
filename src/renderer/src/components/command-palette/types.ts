export type Action = {
  name: string;
  execute(): boolean | void;
  disabled?: boolean;
  keepAlive?: boolean;
};

export type Option = {
  name: string;
  icon?: string;
  image?: string | true;
  actions: Action[];
};


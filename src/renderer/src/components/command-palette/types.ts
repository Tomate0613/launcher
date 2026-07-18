export type Action = {
  name: string;
  execute(): boolean | void | Promise<boolean> | Promise<void>;
  disabled?: boolean;
  keepAlive?: boolean;
};

export type Option = {
  name: string;
  icon?: string;
  image?: string | true;
  actions: Action[];
};


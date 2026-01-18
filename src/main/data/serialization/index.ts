import { log } from '../../../common/logging/log';

const logger = log('Serialization');

export function SerializableProperty<T>(
  type: 'optional' | 'required',
): (target: undefined, context: ClassFieldDecoratorContext) => void;
export function SerializableProperty(
  target: undefined,
  context: ClassFieldDecoratorContext,
): void;
export function SerializableProperty(
  arg1: undefined | 'optional' | 'required',
  arg2?: ClassFieldDecoratorContext,
) {
  if (!arg2) {
    return (target: any, context: ClassFieldDecoratorContext) =>
      Property(target, context, arg1 === 'required');
  }

  return Property(arg1 as undefined, arg2, false);
}

function Property(
  _value: undefined,
  context: ClassFieldDecoratorContext,
  isRequired: boolean,
) {
  const name = context.name;

  if (typeof name === 'symbol') {
    throw new Error('Symbols can not be properties');
  }

  const props =
    (context.metadata['serializable:properties'] as [string, boolean][]) ?? [];

  if (props.length === 0) {
    props.push(['__version', true]);
  }

  props.push([name, isRequired]);
  context.metadata['serializable:properties'] = props;
}

export type ConstructArgs<A extends Serializable> = A['_constructor'] extends (
  version: string,
  ...args: infer Args
) => void
  ? Args
  : never;

type SerializableClass<A extends Serializable> = {
  new (...args: any[]): A;
  prototype: {
    constructor: Function;
  };
};

function getProperties<A extends Serializable>(
  target: SerializableClass<A> | Function,
) {
  // Hopefully not needed anymore in the future?
  const symbol = Object.getOwnPropertySymbols(target).find(
    (s) => s.description === 'Symbol.metadata',
  )!;
  const properties = target[symbol]?.['serializable:properties'] as
    | [string, boolean][]
    | undefined;

  if (target[Symbol.metadata]) {
    logger.warn('Symbol.metadata workaround no longer necessary');
  }

  if (!properties) {
    logger.warn(
      'Properties not found',
      target,
      target[Symbol.metadata],
      target[symbol],
    );
    throw new Error('No properties specified');
  }

  return properties;
}

export class Serializable {
  static fromJSON<A extends Serializable>(
    json: string,
    target: SerializableClass<A>,
    ...args: ConstructArgs<A>
  ): A {
    const parsed = JSON.parse(json);
    return this.applyValues(target, parsed, args);
  }

  private static applyValues<A extends Serializable>(
    target: SerializableClass<A>,
    values: Record<string, unknown> & { __version: string },
    args: ConstructArgs<A>,
  ): A {
    const out = Object.create(target.prototype);
    const keys = Object.keys(values);
    const properties = getProperties(target);

    for (const [key, isRequired] of properties) {
      if (!keys.includes(key) && isRequired) {
        logger.warn(`Property "${key}" is missing`);
      }

      out[key] = values[key];
    }

    out._constructor(values.__version, ...args);
    return out;
  }

  _constructor(_version: string, ..._args: unknown[]) {}

  toJSON() {
    const properties = getProperties(this.constructor);
    const serialized: Record<string, unknown> = {};

    for (const [key, _isRequired] of properties) {
      serialized[key] = (this as never)[key];
    }

    return serialized;
  }
}

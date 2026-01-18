type Lockable = {
  lock: Map<string, Promise<void>>;
};

export function Lock<This2 extends Lockable, Args extends any[]>(
  keyLookup: (...args: Args) => string,
) {
  return function <
    This extends This2,
    Method extends (this: This, ...args: Args) => any,
  >(target: Method, context: ClassMethodDecoratorContext<This, Method>) {
    const processName = String(context.name);

    context.addInitializer(function () {
      this[processName] = this[processName].bind(this);
    });

    async function replacementMethod(this: This, ...args: Args): Promise<any> {
      const key = keyLookup(...args);

      try {
        const promise = target.call(this, ...args);
        this.lock.set(key, promise);
      } finally {
        this.lock.delete(key);
      }
    }

    return replacementMethod;
  };
}

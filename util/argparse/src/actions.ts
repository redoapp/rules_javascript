import {
  Action,
  ActionConstructorOptions,
  ArgumentParser,
  Namespace,
} from "argparse";

/**
 * Faster version of "append" action.
 * @see {@link https://github.com/nodeca/argparse/issues/184 | nodeca/argparse#184}
 */
export class AppendAction extends Action {
  private readonly default: any;

  constructor(options: ActionConstructorOptions) {
    super(options);
    this.default = (options as any).default;
  }

  call(_: ArgumentParser, namespace: Namespace, values: string | string[]) {
    let items = namespace[this.dest];
    if (items === this.default) {
      items = this.default ? [...this.default] : [];
      namespace[this.dest] = items;
    }
    items.push(values);
  }
}

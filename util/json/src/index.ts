export type Json = any;

export interface JsonFormat<T> {
  fromJson(json: any): T;
  toJson(value: T): Json;
}

export namespace JsonFormat {
  export function parse<T>(format: JsonFormat<T>, string: string): T {
    return format.fromJson(JSON.parse(string));
  }

  export function stringify<T>(format: JsonFormat<T>, value: T) {
    return JSON.stringify(format.toJson(value));
  }
}

export namespace JsonFormat {
  export function array<T>(elementFormat: JsonFormat<T>): JsonFormat<T[]> {
    return new ArrayJsonFormat(elementFormat);
  }

  export function map<K, V>(
    keyFormat: JsonFormat<K>,
    valueFormat: JsonFormat<V>,
  ): JsonFormat<Map<K, V>> {
    return new MapJsonFormat(keyFormat, valueFormat);
  }

  export function stringMap<V>(
    valueFormat: JsonFormat<V>,
  ): JsonFormat<Map<string, V>> {
    return new StringMapJsonFormat(valueFormat);
  }

  export function object<V extends {}>(format: {
    [K in keyof V]: JsonFormat<V[K]>;
  }): JsonFormat<V> {
    return new ObjectJsonFormat(format);
  }

  export function defer<T>(format: () => JsonFormat<T>): JsonFormat<T> {
    let cached: JsonFormat<T> | undefined;
    return {
      fromJson(json: any) {
        if (!cached) {
          cached = format();
        }
        return cached.fromJson(json);
      },
      toJson(value: T) {
        if (!cached) {
          cached = format();
        }
        return cached.toJson(value);
      },
    };
  }

  export function any(): JsonFormat<any> {
    return new AnyJsonFormat();
  }

  export function boolean(): JsonFormat<boolean> {
    return new IdentityJsonFormat();
  }

  export function buffer(): JsonFormat<Buffer> {
    return new BufferJsonFormat();
  }

  export function identity<T>(): JsonFormat<T> {
    return new IdentityJsonFormat();
  }

  export function nullable<T>(format: JsonFormat<T>): JsonFormat<T | null> {
    return new NullableJsonFormat(format);
  }

  export function number(): JsonFormat<number> {
    return new IdentityJsonFormat<number>();
  }

  export function set<T>(format: JsonFormat<T>) {
    return new SetJsonFormat(format);
  }

  export function string(): JsonFormat<string> {
    return new IdentityJsonFormat<string>();
  }

  export function symbolConstant<T extends symbol>(symbol: T): JsonFormat<T> {
    return new SymbolJsonFormat(symbol);
  }
}

class AnyJsonFormat implements JsonFormat<any> {
  fromJson(json: any) {
    return json;
  }

  toJson(value: any) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return value;
    }
    const json = <Json>{};
    for (const key of Object.keys(value).sort()) {
      json[key] = this.toJson(value[key]);
    }
    return json;
  }
}

class ArrayJsonFormat<T> implements JsonFormat<T[]> {
  constructor(private readonly elementFormat: JsonFormat<T>) {}

  fromJson(json: any) {
    return json.map((element: any) => this.elementFormat.fromJson(element));
  }

  toJson(json: any) {
    return json.map((element: any) => this.elementFormat.toJson(element));
  }
}

class BufferJsonFormat implements JsonFormat<Buffer> {
  fromJson(json: any) {
    return Buffer.from(json, "base64");
  }

  toJson(value: Buffer) {
    return value.toString("base64");
  }
}

class IdentityJsonFormat<T> implements JsonFormat<T> {
  fromJson(json: any) {
    return json;
  }

  toJson(value: T) {
    return value;
  }
}

class ObjectJsonFormat<V extends {}> implements JsonFormat<V> {
  constructor(format: { [K in keyof V]: JsonFormat<V[K]> }) {
    this.properties = (<[string, JsonFormat<any>][]>(
      Object.entries(format)
    )).sort(([a], [b]) => (a < b ? -1 : b > a ? 1 : 0));
  }

  private readonly properties: [string, JsonFormat<any>][];

  fromJson(json: any): V {
    const result: any = {};
    for (const [key, format] of this.properties) {
      if (key in json) {
        result[key] = format.fromJson(json[key]);
      }
    }
    return result;
  }

  toJson(value: V) {
    const json = <Json>{};
    for (const [key, format] of this.properties) {
      if (key in value) {
        json[key] = format.toJson((<any>value)[key]);
      }
    }
    return json;
  }
}

class MapJsonFormat<K, V> implements JsonFormat<Map<K, V>> {
  constructor(
    private readonly keyFormat: JsonFormat<K>,
    private readonly valueFormat: JsonFormat<V>,
  ) {}

  fromJson(json: any) {
    return new Map<K, V>(
      (<any[]>json).map(({ key, value }) => [
        this.keyFormat.fromJson(key),
        this.valueFormat.fromJson(value),
      ]),
    );
  }

  toJson(value: Map<K, V>) {
    return [...value.keys()].sort().map((key) => ({
      key: this.keyFormat.toJson(key),
      value: this.valueFormat.toJson(value.get(key)!),
    }));
  }
}

class NullableJsonFormat<T> implements JsonFormat<T | null> {
  constructor(private readonly format: JsonFormat<T>) {}

  fromJson(json: any) {
    if (json === null) {
      return null;
    }
    return this.format.fromJson(json);
  }

  toJson(value: T | null) {
    if (value === null) {
      return null;
    }
    return this.format.toJson(value);
  }
}

class SetJsonFormat<T> implements JsonFormat<Set<T>> {
  constructor(private readonly format: JsonFormat<T>) {}

  fromJson(json: any) {
    return new Set<T>(
      json.map((element: any) => this.format.fromJson(element)),
    );
  }

  toJson(value: Set<T>) {
    return [...value].map((element) => this.format.toJson(element));
  }
}

class StringMapJsonFormat<V> implements JsonFormat<Map<string, V>> {
  constructor(private readonly valueFormat: JsonFormat<V>) {}

  fromJson(json: any) {
    return new Map<string, V>(
      Object.entries(json).map(([key, value]) => [
        key,
        this.valueFormat.fromJson(value),
      ]),
    );
  }

  toJson(value: Map<string, V>) {
    return Object.fromEntries(
      [...value.keys()]
        .sort()
        .map((key) => [key, this.valueFormat.toJson(value.get(key)!)]),
    );
  }
}

class SymbolJsonFormat<T extends symbol> implements JsonFormat<T> {
  constructor(private readonly symbol: T) {
    if (this.symbol.description === undefined) {
      throw new Error("Symbol has no description");
    }
  }

  fromJson() {
    return this.symbol;
  }

  toJson() {
    return this.symbol.description;
  }
}

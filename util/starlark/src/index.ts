export type StarlarkValue =
  | StarlarkBoolean
  | StarlarkDict
  | StarlarkList
  | StarlarkNone
  | StarlarkString
  | StarlarkStruct;

export class StarlarkBoolean {
  constructor(readonly value: boolean) {}
}

export class StarlarkDict {
  constructor(readonly elements: [StarlarkValue, StarlarkValue][]) {}
}

export class StarlarkList {
  constructor(readonly elements: StarlarkValue[]) {}
}

export class StarlarkNone {}

export class StarlarkString {
  constructor(readonly value: string) {}
}

export class StarlarkStruct {
  constructor(readonly elements: [string, StarlarkValue][]) {}
}

export type StarlarkExpression = StarlarkVariable;

export class StarlarkVariable {
  constructor(readonly value: string) {}
}

export class StarlarkEqualStatement {
  constructor(
    readonly left: StarlarkVariable,
    readonly right: StarlarkValue,
  ) {}
}

export type StarlarkStatement = StarlarkEqualStatement;

export class StarlarkFile {
  constructor(readonly statements: StarlarkStatement[]) {}
}

function isPrintMultiline(value: StarlarkValue): boolean {
  if (value instanceof StarlarkList) {
    return (
      !!value.elements.length &&
      (value.elements.length !== 1 || isPrintMultiline(value.elements[0]))
    );
  }
  if (value instanceof StarlarkDict) {
    return (
      !!value.elements.length &&
      (value.elements.length !== 1 || value.elements[0].some(isPrintMultiline))
    );
  }
  if (value instanceof StarlarkStruct) {
    return (
      !!value.elements.length &&
      (value.elements.length !== 1 || isPrintMultiline(value.elements[0][1]))
    );
  }
  return false;
}

function printBoolean(value: StarlarkBoolean): string {
  return value.value ? "True" : "False";
}

function printDict(value: StarlarkDict, indent: string): string {
  const isMultiline = isPrintMultiline(value);
  let output = "";
  output += "{";
  if (isMultiline) {
    output += "\n";
  }
  for (const [k, v] of value.elements) {
    if (isMultiline) {
      output += indent + "    ";
    }
    output += printValue(k, indent + "    ");
    output += ": ";
    output += printValue(v, indent + "    ");
    if (isMultiline) {
      output += ",\n";
    }
  }
  if (isMultiline) {
    output += indent;
  }
  output += "}";
  return output;
}

function printList(value: StarlarkList, indent: string): string {
  const isMultiline = isPrintMultiline(value);
  let output = "";
  output += "[";
  if (isMultiline) {
    output += "\n";
  }
  for (const v of value.elements) {
    if (isMultiline) {
      output += indent + "    ";
    }
    output += printValue(v, indent + "    ");
    if (isMultiline) {
      output += ",\n";
    }
  }
  if (isMultiline) {
    output += indent;
  }
  output += "]";
  return output;
}

function printNone() {
  return "None";
}

function printString(value: StarlarkString): string {
  return JSON.stringify(value.value);
}

function printStruct(value: StarlarkStruct, indent: string): string {
  const isMultiline = isPrintMultiline(value);
  let output = "";
  output += "struct(";
  if (isMultiline) {
    output += "\n";
  }
  for (const [k, v] of value.elements) {
    if (isMultiline) {
      output += indent + "    ";
    }
    output += k;
    output += " = ";
    output += printValue(v, indent + "    ");
    if (isMultiline) {
      output += ",\n";
    }
  }
  if (isMultiline) {
    output += indent;
  }
  output += ")";
  return output;
}

function printValue(value: StarlarkValue, indent: string): string {
  if (value instanceof StarlarkList) {
    return printList(value, indent);
  }
  if (value instanceof StarlarkBoolean) {
    return printBoolean(value);
  }
  if (value instanceof StarlarkDict) {
    return printDict(value, indent);
  }
  if (value instanceof StarlarkNone) {
    return printNone();
  }
  if (value instanceof StarlarkString) {
    return printString(value);
  }
  if (value instanceof StarlarkStruct) {
    return printStruct(value, indent);
  }
  throw new Error(`Unrecognized value: ${value}`);
}

function printVariable(value: StarlarkVariable): string {
  return value.value;
}

function printEqualStatement(value: StarlarkEqualStatement): string {
  let output = "";
  output += printVariable(value.left);
  output += " = ";
  output += printValue(value.right, "");
  output += "\n";
  return output;
}

function printStatement(value: StarlarkStatement): string {
  if (value instanceof StarlarkEqualStatement) {
    return printEqualStatement(value);
  }
  throw new Error(`Unrecognized value: ${value}`);
}

export function printStarlark(file: StarlarkFile): string {
  return file.statements
    .map((statement) => printStatement(statement))
    .join("\n");
}

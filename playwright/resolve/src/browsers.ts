import { JsonFormat } from "@rules-javascript/util-json";
import { BrowserName, InternalTool } from "./playwright/registry";

export interface Browsers {
  browsers: Browser[];
}

export interface Browser {
  name: BrowserName | InternalTool;
  revision: string;
  revisionOverrides?: { [key: string]: string };
}

export const browsersFormat: JsonFormat<Browsers> = JsonFormat.object({
  browsers: JsonFormat.array(
    JsonFormat.object({
      name: JsonFormat.identity(),
      revision: JsonFormat.string(),
      revisionOverrides: JsonFormat.identity<Browser["revisionOverrides"]>(),
    }),
  ),
});

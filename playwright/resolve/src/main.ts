import { JsonFormat } from "@better-rules-javascript/util-json";
import {
  printStarlark,
  StarlarkDict,
  StarlarkEqualStatement,
  StarlarkFile,
  StarlarkString,
  StarlarkStruct,
  StarlarkValue,
} from "@better-rules-javascript/util-starlark";
import { Semaphore } from "@better-rules-javascript/util/lock";
import { ArgumentParser } from "argparse";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Browser, browsersFormat } from "./browsers";
import { hashUpdateStream } from "./digest";
import { HostPlatform } from "./playwright/platform";
import { DOWNLOAD_PATHS, PLAYWRIGHT_CDN_MIRRORS } from "./playwright/registry";

const parser = new ArgumentParser({
  description: "Resolve browsers",
  prog: "playwright-resolve",
});
parser.add_argument("--browsers", { required: true });
const args: { browsers: string } = parser.parse_args();

(async () => {
  let { browsers } = JsonFormat.parse(
    browsersFormat,
    await readFile(args.browsers, "utf8"),
  );

  const toolsElements = Array.from(
    tools(browsers),
    (tool): [StarlarkValue, StarlarkValue] => {
      return [
        new StarlarkString(tool.name),
        new StarlarkDict(
          Array.from(tool.platforms.entries(), ([platform, version]) => [
            new StarlarkString(platform),
            new StarlarkString(version),
          ]),
        ),
      ];
    },
  );
  const tools_ = new StarlarkDict(toolsElements);

  const requestThrottle = new Semaphore(4);
  const toolVersionsElements = await Promise.all(
    // deprecated-webkit URLs have 400
    [...toolVersions(browsers)]
      .filter(
        (version) =>
          !version.urlPath.includes("mac-10") &&
          !version.urlPath.includes("mac-11") &&
          !version.urlPath.includes("mac-12"),
      )
      .map((version) =>
        requestThrottle.use(
          async (): Promise<[StarlarkValue, StarlarkValue]> => {
            const url = new URL(
              version.urlPath,
              `${PLAYWRIGHT_CDN_MIRRORS[0]}/`,
            );
            console.error(`Fetching ${url}`);
            try {
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status} ${response.statusText}`,
                );
              }
              const hash = await hashUpdateStream(
                createHash("sha256"),
                response.body!,
              );
              return [
                new StarlarkString(version.name),
                new StarlarkStruct([
                  [
                    "integrity",
                    new StarlarkString(`sha256-${hash.digest("base64")}`),
                  ],
                  ["path", new StarlarkString(version.path)],
                  ["url_path", new StarlarkString(version.urlPath)],
                ]),
              ];
            } catch (e) {
              throw new Error(`Failed to fetch ${url}: ${e}`);
            }
          },
        ),
      ),
  );
  const toolVersions_ = new StarlarkDict(toolVersionsElements);

  const file = new StarlarkFile([
    new StarlarkEqualStatement(new StarlarkString("TOOLS"), tools_),
    new StarlarkEqualStatement(
      new StarlarkString("TOOL_VERSIONS"),
      toolVersions_,
    ),
  ]);

  process.stdout.write(printStarlark(file));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function* tools(browsers: Browser[]) {
  for (const browser of browsers) {
    const platforms = new Map<string, string>();
    for (const platform in DOWNLOAD_PATHS[browser.name]) {
      const version = versionResolve(browser, platform as HostPlatform);
      if (version === undefined) {
        continue;
      }
      platforms.set(platform, version.name);
    }
    yield { name: browser.name, platforms };
  }
}

function* toolVersions(browsers: Browser[]) {
  const names = new Set<string>();
  for (const browser of browsers) {
    for (const platform in DOWNLOAD_PATHS[browser.name]) {
      const version = versionResolve(browser, platform as HostPlatform);
      if (version === undefined) {
        continue;
      }
      if (names.has(version.name)) {
        continue;
      }
      names.add(version.name);
      yield version;
    }
  }
}

interface Version {
  name: string;
  path: string;
  urlPath: string;
}

function versionResolve(
  browser: Browser,
  platform: HostPlatform,
): Version | undefined {
  let urlPath = DOWNLOAD_PATHS[browser.name][platform];
  if (urlPath === undefined) {
    return undefined;
  }
  const revision = browser.revisionOverrides?.[platform] ?? browser.revision;
  urlPath = urlPath.replace("%s", revision);
  return {
    name: `${urlPath.split("/").at(-1)!.replace(/\..*$/, "")}-${revision}`,
    path: `${browser.name.replace(/-/g, "_")}-${revision}`,
    urlPath,
  };
}

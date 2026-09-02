/** ESLint parser: ESTree from @typescript-eslint/parser, type information from tsgo's `typescript/unstable/sync` API. */
import path from "node:path";
import { createTsgoProjectClass } from "./bridge.js";
import { createEnumRemaps } from "./enums.js";

/** Options: `ts` (Strada module the rules import), `tsParser`, `tsgoSync`, `tsgoAst`, optional default `tsconfig`, `collectTiming`. */
export function createTsgoParser({ ts, tsParser, tsgoSync, tsgoAst, tsconfig, collectTiming = false }) {
  const remaps = createEnumRemaps({ ts, tsgoSync, tsgoAst });
  const env = { ts, API: tsgoSync.API, remaps, collectTiming };
  const { TsgoProject, stats } = createTsgoProjectClass(env);
  const projects = new Map();

  function getProject(tsconfigPath) {
    const key = path.resolve(tsconfigPath);
    let project = projects.get(key);
    if (!project) {
      project = new TsgoProject(key);
      projects.set(key, project);
    }
    return project;
  }

  function closeAllProjects() {
    for (const p of projects.values()) {
      p.close();
    }
    projects.clear();
  }

  function resolveTsconfig(options) {
    const configured = options?.tsgoProject ?? options?.project ?? tsconfig;
    if (typeof configured !== "string") {
      throw new TypeError(
        "tsgo-bridge: parserOptions.project (or the `tsconfig` option) must be a single tsconfig path",
      );
    }
    return path.resolve(options?.tsconfigRootDir ?? process.cwd(), configured);
  }

  function parseForESLint(code, options) {
    const tsconfigPath = resolveTsconfig(options);
    const { project: _project, projectService: _ps, tsgoProject: _tp, programs: _programs, ...rest } = options ?? {};
    const result = tsParser.parseForESLint(code, { ...rest, project: false });
    const tsgo = getProject(tsconfigPath);
    const services = result.services;
    const checker = tsgo.shimChecker;
    const maps = services.esTreeNodeToTSNodeMap;
    const compilerOptions = tsgo.compilerOptions;
    Object.assign(services, {
      program: tsgo.shimProgram,
      emitDecoratorMetadata: compilerOptions.emitDecoratorMetadata ?? false,
      experimentalDecorators: compilerOptions.experimentalDecorators ?? false,
      isolatedDeclarations: compilerOptions.isolatedDeclarations ?? false,
      getContextualType: (node) => checker.getContextualType(maps.get(node)),
      getResolvedSignature: (node) => checker.getResolvedSignature(maps.get(node)),
      getSymbolAtLocation: (node) => checker.getSymbolAtLocation(maps.get(node)),
      getTypeAtLocation: (node) => checker.getTypeAtLocation(maps.get(node)),
      getTypeFromTypeNode: (node) => checker.getTypeFromTypeNode(maps.get(node)),
      getTypeOfSymbolAtLocation: (symbol, node) => checker.getTypeOfSymbolAtLocation(symbol, maps.get(node)),
    });
    return result;
  }

  const parser = {
    meta: { name: "tsgo-bridge", version: "0.0.0" },
    parseForESLint,
  };

  return {
    parser,
    getProject,
    closeAllProjects,
    stats: () => ({ ...stats, projects: [...projects.keys()] }),
  };
}

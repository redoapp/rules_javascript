export function callSitePath(func: Function): string | undefined {
  let callSite: NodeJS.CallSite;
  const { prepareStackTrace, stackTraceLimit } = Error;
  const { sourceMapsEnabled } = process;
  try {
    process.setSourceMapsEnabled(false);
    Error.prepareStackTrace = firstCallSite;
    Error.stackTraceLimit = 1;
    const error = {} as { stack: NodeJS.CallSite };
    Error.captureStackTrace(error, func);
    callSite = error.stack;
  } finally {
    process.setSourceMapsEnabled(sourceMapsEnabled);
    Error.prepareStackTrace = prepareStackTrace;
    Error.stackTraceLimit = stackTraceLimit;
  }
  return callSite!.getFileName() ?? undefined;
}

const firstCallSite: typeof Error.prepareStackTrace = (_, stack) => stack[0];

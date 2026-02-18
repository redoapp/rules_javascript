export function removePrefix(string: string, prefix: string) {
  return string.startsWith(prefix) ? string.slice(prefix.length) : string;
}

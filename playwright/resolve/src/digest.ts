import { Hash } from "node:crypto";

export async function hashUpdateStream(
  hash: Hash,
  stream: AsyncIterable<Uint8Array>,
) {
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash;
}

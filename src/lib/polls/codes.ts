import { randomBytes } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChunk(length: number): string {
  const bytes = randomBytes(length);
  const chars: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % CODE_ALPHABET.length;
    chars.push(CODE_ALPHABET[index]);
  }
  return chars.join("");
}

export function generateCandidateCode(): string {
  const parts = [randomChunk(4), randomChunk(4), randomChunk(4)];
  return parts.join("-");
}

declare module "node:crypto" {
  export function randomUUID(): string;
  export function createHash(algorithm: string): { update(value: string | Uint8Array): { digest(encoding: "hex"): string } };
}

declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:fs/promises" {
  export const lstat: any;
  export const mkdir: any;
  export const readdir: any;
  export const readFile: any;
  export const realpath: any;
  export const rm: any;
  export const rename: any;
  export const stat: any;
  export const unlink: any;
  export const writeFile: any;
}

declare module "node:child_process" {
  export const spawn: any;
}

declare namespace NodeJS {
  interface ErrnoException extends Error { code?: string }
}

declare const Buffer: {
  byteLength(value: string, encoding?: string): number;
  from(value: string, encoding?: string): Uint8Array;
};

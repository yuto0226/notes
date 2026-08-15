/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module 'wawoff2' {
  export function decompress(buffer: Buffer): Promise<Buffer>
  export function compress(buffer: Buffer): Promise<Buffer>
}

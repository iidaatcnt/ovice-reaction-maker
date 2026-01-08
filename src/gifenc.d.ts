declare module 'gifenc' {
    export class GIFEncoder {
        constructor();
        writeFrame(index: Uint8Array, width: number, height: number, options?: any): void;
        finish(): void;
        bytes(): Uint8Array;
        reset(): void;
    }

    export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors: number, options?: any): number[][];
    export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: number[][], options?: any): Uint8Array;
}

declare module 'gifenc' {
    export class GIFEncoder {
        constructor();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writeFrame(index: Uint8Array, width: number, height: number, options?: any): void;
        finish(): void;
        bytes(): Uint8Array;
        reset(): void;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors: number, options?: any): number[][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: number[][], options?: any): Uint8Array;
}

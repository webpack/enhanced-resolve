export type PathType = number;
export var PathType: Readonly<{
    Empty: number;
    Normal: number;
    Relative: number;
    AbsoluteWin: number;
    AbsolutePosix: number;
}>;
export function getType(p: string): number;
export function normalize(p: string): string;
export function join(rootPath: string, request: string | undefined): string;
export function cachedJoin(rootPath: string, request: string | undefined): string;

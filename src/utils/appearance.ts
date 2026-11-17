export interface Appearance {
    boardTheme: string;
    pieceSet: string;
    menuBackground: string;
}

export function isAppearanceId(value: unknown): value is string {
    return typeof value === 'string'
        && value.length >= 1
        && value.length <= 64
        && /^[A-Za-z0-9]/.test(value)
        && !/[^A-Za-z0-9_-]/.test(value);
}

export function normalizeMenuBackground(value: string | null | undefined): string {
    return (value ?? 'default').replace(/\.[^.]+$/, '');
}

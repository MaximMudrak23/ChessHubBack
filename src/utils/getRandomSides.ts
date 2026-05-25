export function getRandomSides() {
    const firstIsWhite = Math.random() < 0.5;
    return {
        firstSide: firstIsWhite ? 'white' : 'black',
        secondSide: firstIsWhite ? 'black' : 'white',
    } as const;
}
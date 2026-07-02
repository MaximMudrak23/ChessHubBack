export const ENGINE_CONFIG = {
    stockfish: { skillOptionName: 'Skill Level', minSkillLevel: 0, maxSkillLevel: 20 },
    komodo: { skillOptionName: 'Skill', minSkillLevel: 1, maxSkillLevel: 25 },
    dragon: { skillOptionName: 'Skill', minSkillLevel: 1, maxSkillLevel: 25 },
} as const;

export function isValidSkillLevel(engine: string, skillLevel: number): boolean {
    const config = ENGINE_CONFIG[engine as keyof typeof ENGINE_CONFIG];
    if (!config) return false;
    return skillLevel >= config.minSkillLevel && skillLevel <= config.maxSkillLevel;
}
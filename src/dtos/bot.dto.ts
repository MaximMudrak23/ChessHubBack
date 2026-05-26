export function getPublicBotDTO(bot: any) {
    return {
        id: bot._id,
        isBot: true,
        name: bot.name,
        description: bot.description,
        avatarURL: bot.avatarURL,
        avatarFrameURL: bot.avatarFrameURL,
        userIcons: bot.userIcons,
        profileBackground: bot.profileBackground,
        profileSong: bot.profileSong,
        elo: bot.elo,
    };
}

export function getPrivateBotDTO(bot: any) {
    return {
        id: bot._id,
        isBot: true,
        botType: bot.botType,
        linkedUserId: bot.linkedUserId,
        name: bot.name,
        description: bot.description,
        avatarURL: bot.avatarURL,
        avatarFrameURL: bot.avatarFrameURL,
        userIcons: bot.userIcons,
        profileBackground: bot.profileBackground,
        profileSong: bot.profileSong,
        elo: bot.elo,
        engine: bot.engine,
        skillLevel: bot.skillLevel,
        pgnFiles: bot.pgnFiles,
        status: bot.status,
    };
}
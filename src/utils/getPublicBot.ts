export function getPublicBot(bot: any) { // this should be in special dto file
    return {
        id: bot._id.toString(),
        isBot: true,
        botType: bot.botType,
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
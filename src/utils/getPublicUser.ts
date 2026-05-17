export function getPublicUser(user: any) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        elo: user.elo,
        role: user.role,
        userIcons: user.userIcons,
        description: user.description,
        avatarURL: user.avatarURL,
        avatarFrameURL: user.avatarFrameURL,
        unlockedFrames: user.unlockedFrames,
        unlockedProfileBackgrounds: user.unlockedProfileBackgrounds,
        unlockedProfileSongs: user.unlockedProfileSongs,
        profileBackground: user.profileBackground,
        profileSong: user.profileSong,
        boardTheme: user.boardTheme,
        menuBackground: user.menuBackground,
    };
}
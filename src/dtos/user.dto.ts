export function getPublicUserDTO(user: any) {
    return {
        id: user._id,
        isBot: false,
        name: user.name,
        elo: user.elo,
        userIcons: user.userIcons,
        description: user.description,
        avatarURL: user.avatarURL,
        avatarFrameURL: user.avatarFrameURL,
        profileBackground: user.profileBackground,
        profileSong: user.profileSong,
    };
}

export function getPrivateUserDTO(user: any) {
    return {
        id: user._id,
        isBot: false,
        name: user.name,
        email: user.email,
        elo: user.elo,
        role: user.role,
        userIcons: user.userIcons,
        description: user.description,
        avatarURL: user.avatarURL,
        avatarFrameURL: user.avatarFrameURL,
        profileBackground: user.profileBackground,
        profileSong: user.profileSong,
        boardTheme: user.boardTheme,
        menuBackground: user.menuBackground,
    };
}

export function getSelfUserDTO(user: any) {
    return {
        id: user._id,
        isBot: false,
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
export function getPlayerIconsDTO(entity: any) {
    return entity.userIcons?.map((icon: any) => ({
        title: icon.title,
        iconURL: icon.iconURL,
    })) ?? [];
}
import { UserModel } from "../models/User.model";
import { BotModel } from "../models/Bot.model";
import { getPlayerIcons } from "./getPlayerIcons";

export async function getPlayerFromTicket(ticket: any) {
    const entity = ticket.ownerType === 'user'
        ? await UserModel.findById(ticket.ownerId)
        : await BotModel.findById(ticket.ownerId);

    if (!entity) return null;

    return {
        playerType: ticket.ownerType as 'user' | 'bot',
        playerId: entity._id,
        name: entity.name,
        elo: entity.elo,
        avatarURL: entity.avatarURL,
        avatarFrameURL: entity.avatarFrameURL,
        userIcons: getPlayerIcons(entity),
        skillLevel: ticket.ownerType === 'bot' && 'skillLevel' in entity ? entity.skillLevel : null,
    };
}
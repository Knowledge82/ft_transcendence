import { FriendsService } from './friends.service';
import { ChatGateway } from '../chat/chat.gateway';
export declare class FriendsController {
    private readonly friendsService;
    private readonly chatGateway;
    constructor(friendsService: FriendsService, chatGateway: ChatGateway);
    listFriends(req: any): Promise<{
        isOnline: boolean;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    }[]>;
    listPendingRequests(req: any): Promise<({
        requester: {
            displayName: string | null;
            id: number;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    })[]>;
    sendRequest(req: any, addresseeId: number): Promise<{
        requester: {
            displayName: string | null;
            id: number;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    }>;
    acceptRequest(req: any, requesterId: number): Promise<{
        id: number;
        createdAt: Date;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    }>;
    removeFriendship(req: any, otherUserId: number): Promise<void>;
}

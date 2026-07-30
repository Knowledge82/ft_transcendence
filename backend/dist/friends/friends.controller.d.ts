import { FriendsService } from './friends.service';
import { ChatGateway } from '../chat/chat.gateway';
export declare class FriendsController {
    private readonly friendsService;
    private readonly chatGateway;
    constructor(friendsService: FriendsService, chatGateway: ChatGateway);
    listFriends(req: any): Promise<{
        isOnline: boolean;
        id: number;
        displayName: string | null;
        avatarUrl: string | null;
    }[]>;
    listPendingRequests(req: any): Promise<({
        requester: {
            id: number;
            displayName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        requesterId: number;
        addresseeId: number;
    })[]>;
    sendRequest(req: any, addresseeId: number): Promise<{
        requester: {
            id: number;
            displayName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        requesterId: number;
        addresseeId: number;
    }>;
    acceptRequest(req: any, requesterId: number): Promise<{
        id: number;
        createdAt: Date;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        requesterId: number;
        addresseeId: number;
    }>;
    removeFriendship(req: any, otherUserId: number): Promise<void>;
}

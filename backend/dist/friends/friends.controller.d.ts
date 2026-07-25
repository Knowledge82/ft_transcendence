import { FriendsService } from './friends.service';
export declare class FriendsController {
    private readonly friendsService;
    constructor(friendsService: FriendsService);
    listFriends(req: any): Promise<{
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
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    })[]>;
    sendRequest(req: any, addresseeId: number): Promise<{
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

import { FriendsService } from './friends.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CommunityService } from '../community/community.service';
export declare class FriendsController {
    private readonly friendsService;
    private readonly chatGateway;
    private readonly communityService;
    constructor(friendsService: FriendsService, chatGateway: ChatGateway, communityService: CommunityService);
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
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        createdAt: Date;
    })[]>;
    sendRequest(req: any, addresseeId: number): Promise<{
        requester: {
            id: number;
            displayName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        createdAt: Date;
    }>;
    acceptRequest(req: any, requesterId: number): Promise<{
        id: number;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        createdAt: Date;
    }>;
    removeFriendship(req: any, otherUserId: number): Promise<void>;
}

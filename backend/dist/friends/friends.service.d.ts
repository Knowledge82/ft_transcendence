import { PrismaService } from '../prisma/prisma.service';
export declare class FriendsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    sendRequest(requesterId: number, addresseeId: number): Promise<{
        id: number;
        createdAt: Date;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    }>;
    acceptRequest(userId: number, requesterId: number): Promise<{
        id: number;
        createdAt: Date;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    }>;
    removeFriendship(userId: number, otherUserId: number): Promise<void>;
    listFriends(userId: number): Promise<{
        id: number;
        displayName: string | null;
        avatarUrl: string | null;
    }[]>;
    listPendingRequests(userId: number): Promise<({
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
}

import { PrismaService } from '../prisma/prisma.service';
export declare class FriendsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBasicInfo(userId: number): Promise<{
        id: number;
        displayName: string | null;
        avatarUrl: string | null;
    } | null>;
    sendRequest(requesterId: number, addresseeId: number): Promise<{
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
    acceptRequest(userId: number, requesterId: number): Promise<{
        id: number;
        createdAt: Date;
        status: import("@prisma/client").$Enums.FriendshipStatus;
        requesterId: number;
        addresseeId: number;
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
        status: import("@prisma/client").$Enums.FriendshipStatus;
        requesterId: number;
        addresseeId: number;
    })[]>;
}

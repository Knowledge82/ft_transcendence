import { PrismaService } from '../prisma/prisma.service';
export declare class FriendsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBasicInfo(userId: number): Promise<{
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    } | null>;
    sendRequest(requesterId: number, addresseeId: number): Promise<{
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
    acceptRequest(userId: number, requesterId: number): Promise<{
        id: number;
        createdAt: Date;
        requesterId: number;
        addresseeId: number;
        status: import("@prisma/client").$Enums.FriendshipStatus;
    }>;
    removeFriendship(userId: number, otherUserId: number): Promise<void>;
    listFriends(userId: number): Promise<{
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    }[]>;
    listPendingRequests(userId: number): Promise<({
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
}

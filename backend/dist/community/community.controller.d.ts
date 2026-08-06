import { CommunityService } from './community.service';
export declare class CommunityController {
    private readonly communityService;
    constructor(communityService: CommunityService);
    getFeed(): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }[]>;
    getTodayFeed(): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }[]>;
}

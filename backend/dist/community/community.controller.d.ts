import { CommunityService } from './community.service';
export declare class CommunityController {
    private readonly communityService;
    constructor(communityService: CommunityService);
    getFeed(): Promise<{
        id: number;
        type: string;
        message: string;
        createdAt: Date;
    }[]>;
}

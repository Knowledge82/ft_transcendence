import type { Response } from 'express';
import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    confess(makefile: string, res: Response): Promise<void>;
}

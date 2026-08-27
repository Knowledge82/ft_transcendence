import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.userId?.toString() ?? req.ip;
  }
  
  // Overrides the default "ThrottlerException: Too Many Requests" message
  // with something that actually tells the user what to do
  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException({ code: 'CONFESSOR_THROTTLED' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

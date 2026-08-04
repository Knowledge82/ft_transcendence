import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  // Overrides the default tracking key (IP address) with the userId when
  // available — otherwise, everyone behind the same campus NAT/router
  // would share a single rate-limit bucket
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.userId?.toString() ?? req.ip;
  }
}

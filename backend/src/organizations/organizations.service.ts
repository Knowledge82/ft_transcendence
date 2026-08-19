import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CREATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations() {
    return this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        manifesto: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOrganizationById(id: number) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true, role: true, gender: true },
            },
          },
        },
        conversation: { select: { id: true } },
      },
    });
    if (!org) {
      throw new NotFoundException({ code: 'ORGANIZATION_NOT_FOUND' });
    }
    return org;
  }

  private async assertCanManage(organizationId: number, requestingUserId: number) {
    const requester = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
    if (requester?.role === 'ARZOBISPO') {
      return;
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { userId: requestingUserId },
    });
    if (membership?.organizationId === organizationId && membership.isLeader) {
      return;
    }

    throw new ForbiddenException({ code: 'NOT_ORGANIZATION_LEADER' });
  }

  async createOrganization(name: string, color: string, creatorId: number) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator || !CREATOR_ROLES.includes(creator.role)) {
      throw new ForbiddenException({ code: 'INSUFFICIENT_RANK_FOR_ORGANIZATION' });
    }

    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: { userId: creatorId },
    });
    if (existingMembership) {
      throw new ConflictException({ code: 'ALREADY_IN_ORGANIZATION' });
    }

    const org = await this.prisma.organization.create({
      data: {
        name,
        color,
        conversation: { create: { type: 'CHANNEL' } },
        members: { create: { userId: creatorId, isLeader: true } },
      },
      include: { conversation: true },
    });

    if (org.conversation) {
      await this.prisma.conversationParticipant.create({
        data: { conversationId: org.conversation.id, userId: creatorId },
      });
    }

    return org;
  }

  async updateOrganization(
    organizationId: number,
    data: { name?: string; manifesto?: string; color?: string },
    requestingUserId: number,
  ) {
    await this.assertCanManage(organizationId, requestingUserId);
    return this.prisma.organization.update({ where: { id: organizationId }, data });
  }

  async deleteOrganization(organizationId: number, requestingUserId: number) {
    await this.assertCanManage(organizationId, requestingUserId);
    await this.prisma.organization.delete({ where: { id: organizationId } });
  }

  async joinOrganization(organizationId: number, userId: number) {
    const existing = await this.prisma.organizationMember.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException({ code: 'ALREADY_IN_ORGANIZATION' });
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { conversation: true },
    });
    if (!org) {
      throw new NotFoundException({ code: 'ORGANIZATION_NOT_FOUND' });
    }

    await this.prisma.organizationMember.create({
      data: { organizationId, userId },
    });

    if (org.conversation) {
      await this.prisma.conversationParticipant.create({
        data: { conversationId: org.conversation.id, userId },
      });
    }

    return org;
  }

  async leaveOrganization(userId: number) {
    const membership = await this.prisma.organizationMember.findUnique({ where: { userId } });
    if (!membership) {
      return;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: membership.organizationId },
      include: { conversation: true },
    });

    await this.prisma.organizationMember.delete({ where: { userId } });

    if (org?.conversation) {
      await this.prisma.conversationParticipant.deleteMany({
        where: { conversationId: org.conversation.id, userId },
      });
    }
  }

  async removeMember(organizationId: number, targetUserId: number, requestingUserId: number) {
    await this.assertCanManage(organizationId, requestingUserId);

    const membership = await this.prisma.organizationMember.findUnique({
      where: { userId: targetUserId },
    });
    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundException({ code: 'NOT_A_MEMBER' });
    }

    await this.leaveOrganization(targetUserId);
  }
}

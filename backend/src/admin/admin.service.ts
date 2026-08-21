import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_ROLES = ['HERMANO', 'INQUISIDOR', 'ARZOBISPO'];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        gender: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async changeRole(requestingUserId: number, userId: number, role: string) {
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException(`El rango debe ser uno de: ${VALID_ROLES.join(', ')}`);
    }

    // Self-service privilege changes are disallowed on principle, not
    // just to prevent an accidental lockout — a role change should
    // always come from someone ELSE'S action, both for a cleaner audit
    // trail and to remove any chance of a misclick on your own row.
    if (requestingUserId === userId) {
      throw new BadRequestException({ code: 'CANNOT_CHANGE_OWN_ROLE' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO' },
      select: { id: true, email: true, displayName: true, role: true, gender: true },
    });
  }

  async deleteUser(requestingUserId: number, userId: number) {
    if (requestingUserId === userId) {
      throw new BadRequestException({ code: 'CANNOT_DELETE_OWN_ACCOUNT' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return user;
  }

  async getAdminStats() {
    const [usersByRoleRaw, totalArticles, totalOrganizations, totalOrgMembers, allUsers] =
      await Promise.all([
        this.prisma.user.groupBy({ by: ['role'], _count: true }),
        this.prisma.article.count(),
        this.prisma.organization.count(),
        this.prisma.organizationMember.count(),
        this.prisma.user.findMany({ select: { createdAt: true } }),
      ]);

    const usersByRole = usersByRoleRaw.map((r) => ({ role: r.role, count: r._count }));

    // Registrations bucketed by day, always exactly 7 buckets (today
    // and the six before it) even for days with zero — the frontend
    // chart needs a complete, gap-free series to render correctly
    const startOfWindow = new Date();
    startOfWindow.setDate(startOfWindow.getDate() - 6);
    startOfWindow.setHours(0, 0, 0, 0);

    const registrationsByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWindow);
      day.setDate(day.getDate() + i);
      registrationsByDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const user of allUsers) {
      const key = user.createdAt.toISOString().slice(0, 10);
      if (registrationsByDay.has(key)) {
        registrationsByDay.set(key, (registrationsByDay.get(key) ?? 0) + 1);
      }
    }
    const registrations = Array.from(registrationsByDay.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // "Most active" here means most logins (each successful login
    // issues a new refresh token) — a broader presence signal than
    // counting chat messages, which only reflects one specific activity
    const loginCounts = await this.prisma.refreshToken.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    });
    const topUserIds = loginCounts.map((l) => l.userId);
    const topUsersInfo = await this.prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, displayName: true },
    });
    const topActiveUsers = loginCounts.map((l) => ({
      userId: l.userId,
      displayName:
        topUsersInfo.find((u) => u.id === l.userId)?.displayName ?? `Usuario ${l.userId}`,
      loginCount: l._count.userId,
    }));

    return {
      usersByRole,
      registrations,
      totalArticles,
      totalOrganizations,
      totalOrgMembers,
      topActiveUsers,
    };
  }
}

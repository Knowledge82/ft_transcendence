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
}

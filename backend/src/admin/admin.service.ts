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

  async changeRole(userId: number, role: string) {
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException(`El rango debe ser uno de: ${VALID_ROLES.join(', ')}`);
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

  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.prisma.user.delete({ where: { id: userId } });
  }
}

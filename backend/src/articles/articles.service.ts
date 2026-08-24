import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AUTHOR_SELECT = {
  author: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      avatarPositionX: true,
      avatarPositionY: true,
      role: true,
      gender: true,
    },
  },
  organization: {
    select: { id: true, name: true, color: true },
  },
};

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async createArticle(
    authorId: number,
    title: string,
    content: string,
    organizationId?: number,
  ) {
    return this.prisma.article.create({
      data: { authorId, title, content, organizationId },
      include: AUTHOR_SELECT,
    });
  }

  async getAllArticles() {
    return this.prisma.article.findMany({
      where: { organizationId: null },
      orderBy: { createdAt: 'desc' },
      include: AUTHOR_SELECT,
    });
  }

  async getOrganizationArticles(organizationId: number) {
    return this.prisma.article.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: AUTHOR_SELECT,
    });
  }

  async getArticleById(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: AUTHOR_SELECT,
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  async updateArticle(id: number, title: string, content: string) {
    return this.prisma.article.update({
      where: { id },
      data: { title, content },
      include: AUTHOR_SELECT,
    });
  }

  async deleteArticle(id: number) {
    const article = await this.getArticleById(id);
    await this.prisma.article.delete({ where: { id } });
    return article;
  }

  async getUserRole(userId: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? null;
  }

  async getUserBasicInfo(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true },
    });
  }

  async isOrganizationMember(userId: number, organizationId: number): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({ where: { userId } });
    return membership?.organizationId === organizationId;
  }

  async getRandomArticles(count: number) {
    const allIds = await this.prisma.article.findMany({
      where: { organizationId: null },
      select: { id: true },
    });
    if (allIds.length === 0) {
      return [];
    }

    const shuffled = [...allIds].sort(() => Math.random() - 0.5);
    const pickedIds = shuffled.slice(0, count).map((a) => a.id);

    return this.prisma.article.findMany({
      where: { id: { in: pickedIds } },
      include: AUTHOR_SELECT,
    });
  }
}

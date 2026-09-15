import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
@Injectable()
export class AccountService {
  constructor(private readonly db: PrismaService) {}
  async deleteAccount(userId: string) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      await tx.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      await tx.user.deleteMany({ where: { id: userId } });
    });
    return { deleted: true };
  }
}

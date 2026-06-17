import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}

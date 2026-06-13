import { PrismaClient } from "../generated/prisma/client";
declare global {
    var flowpilotPrisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient;

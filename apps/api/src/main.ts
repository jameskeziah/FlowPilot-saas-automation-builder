import "reflect-metadata";
import { apiEnv } from "@flowpilot/env/api";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: apiEnv.WEB_APP_URL ?? "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  const port = apiEnv.API_PORT;
  await app.listen(port);
  console.log(`FlowPilot API running on http://localhost:${port}`);
}

bootstrap();

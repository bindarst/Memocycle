import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { ZodError } from "zod";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module";
@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof ZodError
        ? 400
        : error instanceof HttpException
          ? error.getStatus()
          : 500;
    response.status(status).json({
      statusCode: status,
      message:
        status === 400
          ? "Données invalides"
          : status === 401
            ? "Connexion nécessaire"
            : status === 429
              ? "Réessaie dans une minute"
              : "Requête impossible",
    });
  }
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
    bodyParser: true,
  });
  const requests = new Logger("HTTP");
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    response.setHeader("X-Request-ID", requestId);
    response.once("finish", () => {
      requests.log(
        JSON.stringify({
          requestId,
          route: `${request.method} ${request.path}`,
          status: response.statusCode,
          latencyMs: Math.round(performance.now() - startedAt),
        }),
      );
    });
    next();
  });
  app.use(helmet());
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.enableCors({
    origin: process.env.PUBLIC_ORIGIN ?? "https://memocycle.app",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new SafeErrors());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}
void bootstrap();

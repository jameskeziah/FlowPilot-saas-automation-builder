import { IsOptional } from "class-validator";

export class RunWorkflowDto {
  @IsOptional()
  input?: unknown;
}

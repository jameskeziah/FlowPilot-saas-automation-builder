import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, Max, Min } from "class-validator";
import { WorkflowStatus } from "@flowpilot/database";

export class ListWorkflowsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  tagId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 20))
  @Min(1)
  @Max(100)
  limit = 20;
}

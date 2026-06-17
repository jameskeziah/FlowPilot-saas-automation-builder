import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";
import type { WorkflowFlowEdgeDto, WorkflowFlowNodeDto } from "./create-workflow.dto";

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsArray()
  @IsOptional()
  nodes?: WorkflowFlowNodeDto[];

  @IsArray()
  @IsOptional()
  edges?: WorkflowFlowEdgeDto[];
}

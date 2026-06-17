import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export type WorkflowFlowNodeDto = {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data?: Record<string, unknown>;
};

export type WorkflowFlowEdgeDto = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export class CreateWorkflowDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

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

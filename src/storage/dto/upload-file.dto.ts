import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsString()
  @IsOptional()
  folder?: string;
}

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StorageService } from './storage.service';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('projectName') projectName: string,
    @Query('folder') folder?: string,
  ): Promise<FileUploadResponseDto> {
    if (!projectName) {
      throw new BadRequestException('Project name is required');
    }

    return await this.storageService.uploadFile(file, projectName, folder);
  }

@Get('files/:projectName/*filePath')
async getFile(
  @Param('projectName') projectName: string,
  @Param('filePath') filePath: string,
  @Res() res: Response,
): Promise<void> {
  if (!filePath) {
    throw new BadRequestException('File path is required');
  }

  const pathParts = filePath.split(',');
  const fileName = pathParts.pop();
  const folder = pathParts.length > 0 ? pathParts.join('/') : undefined;

  const fileInfo = await this.storageService.getFile(
    projectName,
    fileName as string,
    folder ? folder : undefined,
  );

  res.sendFile(fileInfo.filePath);
}

  @Delete('files/:projectName/:fileName')
  async deleteFile(
    @Param('projectName') projectName: string,
    @Param('fileName') fileName: string,
    @Query('folder') folder?: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.storageService.deleteFile(projectName, fileName, folder);
  }

  @Get('projects/:projectName/files')
  async getProjectFiles(
    @Param('projectName') projectName: string,
    @Query('folder') folder?: string,
  ): Promise<{ files: string[]; projectName: string; folder?: string }> {
    const files = await this.storageService.getProjectFiles(projectName, folder);
    
    return {
      files,
      projectName,
      folder,
    };
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}

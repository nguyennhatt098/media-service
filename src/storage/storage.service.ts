import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';

@Injectable()
export class StorageService {
  private readonly uploadPath = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirectoryExists();
  }

  private ensureUploadDirectoryExists(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  private ensureProjectDirectoryExists(projectName: string, folder?: string): string {
    let projectPath = path.join(this.uploadPath, projectName);
    
    if (folder) {
      projectPath = path.join(projectPath, folder);
    }

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    return projectPath;
  }

  private getFileExtension(originalName: string): string {
    return path.extname(originalName).toLowerCase();
  }

  private isValidImageExtension(extension: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return validExtensions.includes(extension);
  }

  async uploadFile(
    file: Express.Multer.File,
    projectName: string,
    folder?: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileExtension = this.getFileExtension(file.originalname);
    
    if (!this.isValidImageExtension(fileExtension)) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Tạo tên file unique
    const fileName = `${uuidv4()}${fileExtension}`;
    
    // Tạo thư mục project nếu chưa tồn tại
    const projectPath = this.ensureProjectDirectoryExists(projectName, folder);
    
    // Đường dẫn đầy đủ của file
    const filePath = path.join(projectPath, fileName);
    
    try {
      // Lưu file
      fs.writeFileSync(filePath, file.buffer);
      
      // Tạo relative path để trả về
      let relativePath = path.join(projectName, fileName);
      if (folder) {
        relativePath = path.join(projectName, folder, fileName);
      }
      
      // Chuẩn hóa path separator cho URL
      const urlPath = relativePath.replace(/\\/g, '/');

      return {
        success: true,
        message: 'File uploaded successfully',
        filePath: `${process.env.BASE_URL}/api/storage/files/${urlPath}`,
        fileName: fileName,
        originalName: file.originalname,
        fileSize: file.size,
        projectName: projectName,
        uploadDate: new Date(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async getFile(projectName: string, fileName: string, folder?: string): Promise<{ filePath: string; exists: boolean }> {
    let filePath = path.join(this.uploadPath, projectName, fileName);
    
    if (folder) {
      filePath = path.join(this.uploadPath, projectName, folder, fileName);
    }

    const exists = fs.existsSync(filePath);
    
    if (!exists) {
      throw new NotFoundException('File not found');
    }

    return {
      filePath,
      exists
    };
  }

  async deleteFile(projectName: string, fileName: string, folder?: string): Promise<{ success: boolean; message: string }> {
    let filePath = path.join(this.uploadPath, projectName, fileName);
    
    if (folder) {
      filePath = path.join(this.uploadPath, projectName, folder, fileName);
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    try {
      fs.unlinkSync(filePath);
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  async getProjectFiles(projectName: string, folder?: string): Promise<string[]> {
    let projectPath = path.join(this.uploadPath, projectName);
    
    if (folder) {
      projectPath = path.join(projectPath, folder);
    }

    if (!fs.existsSync(projectPath)) {
      return [];
    }

    try {
      const files = fs.readdirSync(projectPath);
      return files.filter(file => {
        const filePath = path.join(projectPath, file);
        return fs.statSync(filePath).isFile();
      });
    } catch (error) {
      throw new BadRequestException(`Failed to read project files: ${error.message}`);
    }
  }
}

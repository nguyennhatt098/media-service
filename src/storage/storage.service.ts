import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
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

  private async optimizeImage(buffer: Buffer, originalName: string): Promise<{ buffer: Buffer; extension: string }> {
    const originalExt = this.getFileExtension(originalName);
    const quality = parseInt(process.env.IMAGE_QUALITY || '85');
    const maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH || '1920');
    const convertToWebP = process.env.CONVERT_TO_WEBP === 'true';
    
    try {
      let optimizedBuffer: Buffer;
      let finalExtension = originalExt;

      // Chuyển đổi sang WebP cho compression tốt nhất (trừ GIF để giữ animation)
      if (originalExt === '.gif') {
        // GIF giữ nguyên để bảo toàn animation
        optimizedBuffer = buffer;
      } else {
        // Optimize và chuyển sang WebP hoặc JPEG
        const sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();
        
        // Resize trước nếu ảnh quá lớn
        let processedInstance = sharpInstance;
        if (metadata.width && metadata.width > maxWidth) {
          processedInstance = sharpInstance.resize({ 
            width: maxWidth, 
            withoutEnlargement: true,
            fit: 'inside'
          });
        }
        
        if (convertToWebP && (metadata.hasAlpha || originalExt === '.png')) {
          // PNG với alpha channel -> WebP
          optimizedBuffer = await processedInstance
            .webp({ quality, effort: 6, lossless: false })
            .toBuffer();
          finalExtension = '.webp';
        } else if (convertToWebP && ['.jpg', '.jpeg'].includes(originalExt)) {
          // JPEG -> WebP
          optimizedBuffer = await processedInstance
            .webp({ quality, effort: 6 })
            .toBuffer();
          finalExtension = '.webp';
        } else {
          // Fallback to optimized JPEG
          optimizedBuffer = await processedInstance
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer();
          finalExtension = '.jpg';
        }
      }

      const originalSize = buffer.length;
      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      console.log(`Image optimized: ${originalName} (${originalSize} -> ${optimizedSize} bytes, ${compressionRatio}% saved)`);

      return { buffer: optimizedBuffer, extension: finalExtension };
    } catch (error) {
      console.log('Image optimization failed, using original:', error.message);
      return { buffer, extension: originalExt };
    }
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
      // Optimize ảnh trước khi lưu
      const { buffer: optimizedBuffer, extension: finalExtension } = await this.optimizeImage(file.buffer, file.originalname);
      
      // Cập nhật tên file với extension đã optimize
      const optimizedFileName = `${uuidv4()}${finalExtension}`;
      const optimizedFilePath = path.join(projectPath, optimizedFileName);
      
      // Lưu file đã optimize
      fs.writeFileSync(optimizedFilePath, optimizedBuffer);
      
      // Tạo relative path để trả về
      let relativePath = path.join(projectName, optimizedFileName);
      if (folder) {
        relativePath = path.join(projectName, folder, optimizedFileName);
      }
      
      // Chuẩn hóa path separator cho URL
      const urlPath = relativePath.replace(/\\/g, '/');

      return {
        success: true,
        message: 'File uploaded and optimized successfully',
        filePath: `${process.env.BASE_URL}/api/storage/files/${urlPath}`,
        fileName: optimizedFileName,
        originalName: file.originalname,
        fileSize: optimizedBuffer.length,
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

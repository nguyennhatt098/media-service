export class FileUploadResponseDto {
  success: boolean;
  message: string;
  filePath: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  projectName: string;
  uploadDate: Date;
}

// @ts-ignore - backblaze-b2 doesn't have types
import B2 from 'backblaze-b2';

export class B2Service {
  private b2: B2;
  private bucketId: string;
  private initialized = false;

  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
      applicationKey: process.env.B2_APPLICATION_KEY!,
    });
    this.bucketId = process.env.B2_BUCKET_ID!;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.b2.authorize();
      this.initialized = true;
      console.log('B2 Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize B2 Service:', error);
      throw error;
    }
  }

  async uploadFile(
    fileName: string, 
    fileBuffer: Buffer, 
    contentType: string,
    folder: 'audio' | 'images' | 'stems' = 'audio'
  ): Promise<string> {
    await this.initialize();

    try {
      const uploadUrl = await this.b2.getUploadUrl({
        bucketId: this.bucketId,
      });

      const fullFileName = `${folder}/${fileName}`;
      
      const response = await this.b2.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName: fullFileName,
        data: fileBuffer,
        info: {
          'Content-Type': contentType,
        },
      });

      // Return the public URL for the file
      const fileUrl = `https://f005.backblazeb2.com/file/beatari-userfiles-bucket/${fullFileName}`;
      
      console.log(`File uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      console.error('Error uploading file to B2:', error);
      throw error;
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.initialize();

    try {
      // First, get file info to get the file ID
      const fileList = await this.b2.listFileNames({
        bucketId: this.bucketId,
        startFileName: fileName,
        maxFileCount: 1,
      });

      if (fileList.data.files.length > 0) {
        const file = fileList.data.files[0];
        if (file.fileName === fileName) {
          await this.b2.deleteFileVersion({
            fileId: file.fileId,
            fileName: file.fileName,
          });
          console.log(`File deleted successfully: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Error deleting file from B2:', error);
      throw error;
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    return `https://f005.backblazeb2.com/file/beatari-userfiles-bucket/${fileName}`;
  }
}

export const b2Service = new B2Service();
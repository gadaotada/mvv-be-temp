import { mkdir, copyFile, chmod, unlink, access } from 'fs/promises';
import { dirname, join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageManager } from '../';
import { AppError, CustomError } from '../../../errors';

/**
* Local Storage Strategy
* @class LocalStorageStrategy
*/
export class LocalStorageStrategy extends StorageManager {
    /**
    * Store a file
    * @param {Express.Multer.File} file
    * @returns {Promise<Upload.FileInfo>}
    */
    async store(file: Express.Multer.File): Promise<AppTypes.Result<object, CustomError>> {
        const isValid = await this.validateFile(file);

        if (!isValid) {
            return [null, AppError.create('File is not valid', {
                type: "System",
                code: "FILE_NOT_VALID",
                httpCode: 400
            })];
        }

        const filename = this.generateFilename(file);
        const relativePath = this.getRelativePath(filename);
        const fullPath = join(this.config.storage.local.basePath, relativePath);

        const dir = dirname(fullPath);
        try {
            await mkdir(dir, { recursive: true });
        } catch (error) {
            const err = AppError.create('Failed to create directory', {
                type: "System",
                code: "FAILED_TO_CREATE_DIRECTORY",
                httpCode: 500,
                data: error
            })
            this.logger.log(err, 'error');
            return [null, err];
        }
    
        try {
            // Copy file
            await copyFile(file.path, fullPath);
            
            // Set permissions
            await chmod(fullPath, this.config.storage.local.permissions);
    
            // Delete temp file
            await unlink(file.path);
    
            const res = {
                originalName: file.originalname,
                filename,
                path: relativePath,
                size: file.size,
                mimeType: file.mimetype,
                url: this.getUrl({ filename, path: relativePath } as Upload.FileInfo)
            };

            return [res, null];
        } catch (error) {
            const err = AppError.create('Failed to process file', {
                type: "System",
                code: "FAILED_TO_PROCESS_FILE",
                httpCode: 500,
                data: error
            })
            this.logger.log(err, 'error');
            return [null, err];
        }
    }

    /**
    * Delete a file
    * @param {Upload.FileInfo} fileInfo
    * @returns {Promise<boolean>}
    */
    async delete(fileInfo: Upload.FileInfo): Promise<boolean> {
        try {
            const fullPath = join(this.config.storage.local.basePath, fileInfo.path);
            await unlink(fullPath);
            return true;
        } catch (error) {
            this.logger.log({
                message: 'Failed to delete file',
                error,
                file: fileInfo
            }, 'error');
            return false;
        }
    }

    /**
    * Check if a file exists
    * @param {string} filename
    * @returns {Promise<boolean>}
    */
    async exists(filename: string): Promise<boolean> {
        try {
            // Use the same relative path logic as store()
            const relativePath = this.getRelativePath(filename);
            const fullPath = join(this.config.storage.local.basePath, relativePath);
            await access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
    * Get the URL of a file
    * @param {Upload.FileInfo} fileInfo
    * @returns {string}
    */
    getUrl(fileInfo: Upload.FileInfo): string {
        return `${this.config.storage.local.baseUrl}/${fileInfo.path}`;
    }

    /**
    * Generate a filename
    * @param {Express.Multer.File} file
    * @returns {string}
    */
    private generateFilename(file: Express.Multer.File): string {
        const ext = extname(file.originalname);
        return `${uuidv4()}${ext}`;
    }

    /**
    * Get the relative path of a file
    * @param {string} filename
    * @returns {string}
    */
    private getRelativePath(filename: string): string {
        switch (this.config.storage.local.structure) {
            case 'date': {
                const date = new Date();
                return join(
                    date.getFullYear().toString(),
                    (date.getMonth() + 1).toString().padStart(2, '0'),
                    date.getDate().toString().padStart(2, '0'),
                    filename
                );
            }
            case 'hash': {
                const hash = filename.substring(0, 2);
                return join(hash, filename);
            }
            case 'flat':
            default:
                return filename;
        }
    }
} 
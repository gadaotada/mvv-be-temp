import { AppLogger } from '../../logging';
import { dirname } from 'path';
import { lookup } from 'mime-types';
import du = require("du")

/**
* StorageManager
* @class StorageManager
*/
export default abstract class StorageManager implements Upload.StorageStrategy {
    /**
    * @param {AppLogger} logger
    * @param {Upload.Config} config
    */
    protected logger: AppLogger;
    protected config: Upload.Config;

    constructor(config: Upload.Config, logger: AppLogger) {
        this.config = config;
        this.logger = logger;
    }

    /**
    * Store a file
    * @param {Express.Multer.File} file
    * @returns {Promise<AppTypes.Result<object, Error>>}
    */
    abstract store(file: Express.Multer.File): Promise<AppTypes.Result<object, Error>>;

    /**
    * Delete a file
    * @param {Upload.FileInfo} fileInfo
    * @returns {Promise<boolean>}
    */
    abstract delete(fileInfo: Upload.FileInfo): Promise<boolean>;

    /**
    * Check if a file exists
    * @param {string} filename
    * @returns {Promise<boolean>}
    */
    abstract exists(filename: string): Promise<boolean>;

    /**
    * Get the URL of a file
    * @param {Upload.FileInfo} fileInfo
    * @returns {string}
    */
    abstract getUrl(fileInfo: Upload.FileInfo): string;

    /**
    * Validate a file
    * @param {Express.Multer.File} file
    * @returns {boolean}
    */
    protected async validateFile(file: Express.Multer.File): Promise<boolean> {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            this.logger.log(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`, 'error');
            return false;
        }

        // Check disk space
        if (!await this.validateDiskSpace(file.path, file.size)) {
            return false;
        }

        // Read file buffer for real mime-type detection
        const mimeType = lookup(file.originalname);

        // If we can't detect the file type, reject it
        if (!mimeType) {
            this.logger.log(`Could not determine file type for ${file.originalname}`, 'error');
            return false;
        }

        const allowedMimes = this.config.allowedMimes;
        for (const [category, mimes] of Object.entries(allowedMimes)) {
            if (mimes.includes(mimeType)) {
                return true;
            }
        }

        this.logger.log(`File type ${mimeType} is not allowed`, 'error');
        return false;
    }

    protected async validateDiskSpace(filePath: string, fileSize: number): Promise<boolean> {
        try {
            const dir = dirname(filePath);
            const uploadDirSize = await du(this.config.storage.local.basePath);
            const maxUploadSize = this.config.maxUploadDirSize || 1024 * 1024 * 1024; // 1GB default if not specified

            // Check if adding the new file would exceed the upload directory limit
            if (uploadDirSize + fileSize > maxUploadSize) {
                this.logger.log({
                    message: 'Upload directory size limit would be exceeded',
                    required: fileSize,
                    currentSize: uploadDirSize,
                    maxSize: maxUploadSize,
                    path: dir
                }, 'error');
                return false;
            }
            
            return true;
        } catch (error) {
            this.logger.log({
                message: 'Failed to check upload directory size',
                error
            }, 'error');
            return false;
        }
    }
}

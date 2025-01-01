declare namespace Upload {
    interface FileInfo {
        originalName: string;
        filename: string;
        path: string;
        size: number;
        mimeType: string;
        url?: string;
        metadata?: Record<string, any>;
    }

    interface StorageStrategy {
        store(file: Express.Multer.File): Promise<AppTypes.Result<object, Error>>;
        delete(fileInfo: FileInfo): Promise<boolean>;
        exists(filename: string): Promise<boolean>;
        getUrl(fileInfo: FileInfo): string;
    }

    interface Config {
        strategy: 'local' | 'memory';
        maxFileSize: number;
        maxUploadDirSize: number;
        allowedMimes: {
            images: string[];
            documents: string[];
            archives: string[];
        };
        storage: {
            local: {
                basePath: string;
                baseUrl: string;
                structure: 'date' | 'hash' | 'flat';
                permissions: number;
            };
            memory: {
                maxSize: number;
            };
        };
    }
} 
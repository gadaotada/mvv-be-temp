declare namespace AppTypes {
    type Success<T> = [T, null];
    type Failure<E> = [null, E];
    type Result<T, E> = Success<T> | Failure<E>;
}

declare namespace Express {
    interface Request {
        user?: {
            id: string;
            roles: Auth.Role[];
        };
        file?: Express.Multer.File;
        files?: Express.Multer.File[];
    }
}
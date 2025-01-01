import { Connection, PoolConnection, QueryOptions, QueryResult, RowDataPacket } from "mysql2/promise";

interface DTOOptions<T extends QueryResult = RowDataPacket[]> {
    connection: PoolConnection | Connection;
    query: string | QueryOptions;
    values?: any[];
}

interface QuerySuccessResult<T extends QueryResult = RowDataPacket[]> {
    success: true;
    data: T;
    error: null;
    metadata: {
        affectedRows?: number;
        insertId?: number;
    };
}

interface QueryErrorResult {
    success: false;
    error: unknown;
}

type QueryExecutionResult<T extends QueryResult = RowDataPacket[]> = QuerySuccessResult<T> | QueryErrorResult;

/**
* Data Transfer Object (DTO) class for database operations
* @class DTO
* @template T - The type of the query result
*/
export class DTO<T extends QueryResult = RowDataPacket[]> {
    /**
    * @param options - The options for the DTO
    */
    private readonly options: DTOOptions;

    constructor(options: DTOOptions) {
        this.options = options;
    }

    /**
    * Execute the query
    * @returns {Promise<QueryExecutionResult<T>>} The result of the query
    */
    async query(): Promise<QueryExecutionResult<T>> {
        try {
            const [result] = await this.options.connection.query<T>(
                typeof this.options.query === 'string' ? this.options.query : this.options.query.sql,
                this.options.values
            );

            return {
                success: true,
                data: result,
                error: null,
                metadata: {
                    affectedRows: 'affectedRows' in result ? result.affectedRows : undefined,
                    insertId: 'insertId' in result ? result.insertId : undefined
                }
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}
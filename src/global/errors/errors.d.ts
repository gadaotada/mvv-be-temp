
declare namespace AppError {
    type Type = 'Auth' | 'Validation' | 'Database' | 'Business' | 'System';
    type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

    interface Options {
        type?: Type;
        severity?: Severity;
        code?: string;
        data?: any;
        httpCode?: number;
    }
}

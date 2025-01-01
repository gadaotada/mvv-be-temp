export const jobRegistry: Map<string, { target: any; metadata: Jobs.JobMetadata }> = new Map();

/**
 * Decorator for registering a job
 * @param metadata - The metadata for the job
 * @returns {MethodDecorator} - The decorator function
 */
export function Job(metadata: Jobs.JobMetadata): MethodDecorator {
    return function (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        jobRegistry.set(propertyKey.toString(), {
            target,
            metadata: {
                ...metadata,
                name: metadata.name || propertyKey.toString(),
            },
        });
        return descriptor;
    };
}
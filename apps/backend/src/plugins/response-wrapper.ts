import fp from 'fastify-plugin';

export default fp(async (fastify) => {
    // Add preSerialization hook to wrap all API responses in a unified envelope
    fastify.addHook('preSerialization', async (request, reply, payload) => {
        // If content type is set and is not JSON, bypass wrapping (e.g. downloads, images, zip files)
        const contentType = reply.getHeader('content-type') as string | undefined;
        if (contentType && !contentType.includes('application/json')) {
            return payload;
        }

        // If the payload is already wrapped in our ApiResponse shape, bypass wrapping
        if (
            payload &&
            typeof payload === 'object' &&
            'success' in payload &&
            'statusCode' in payload &&
            'shortCode' in payload
        ) {
            return payload;
        }

        const statusCode = reply.statusCode || 200;
        const success = statusCode >= 200 && statusCode < 300;

        let data = payload;
        let message = success ? 'Request completed successfully.' : 'An error occurred.';
        let shortCode = success ? 'SUCCESS' : 'ERROR';

        // Check if payload is an object that contains logical older wrapper fields
        if (payload && typeof payload === 'object') {
            const p = payload as Record<string, any>;
            // If it's a simple logical wrapper returned by older handler e.g. { success: true, message: '...' }
            if ('success' in p && typeof p.success === 'boolean') {
                return {
                    success: p.success,
                    statusCode,
                    shortCode: p.success ? 'SUCCESS' : 'ERROR',
                    message: p.message || message,
                    data: p.data !== undefined ? p.data : null
                };
            }
        }

        return {
            success,
            statusCode,
            shortCode,
            message,
            data
        };
    });

    // Custom Error Handler to format errors into the exact same unified ApiResponse envelope
    fastify.setErrorHandler((error: any, request, reply) => {
        const statusCode = error.statusCode || 500;
        const success = false;
        const shortCode = error.code || 'INTERNAL_SERVER_ERROR';
        const message = error.message || 'An unexpected error occurred.';

        const errorDetails = process.env.NODE_ENV === 'development' ? {
            stack: error.stack,
            validation: error.validation
        } : undefined;

        reply.status(statusCode).send({
            success,
            statusCode,
            shortCode,
            message,
            data: null,
            errorDetails
        });
    });
});

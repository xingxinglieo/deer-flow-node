import { FastifyInstance } from 'fastify';

// 错误码
enum ERROR_CODE {
    NOT_FOUND = 40400,
    ZOD_VALIDATION_ERROR = 40300,
    INTERNAL_SERVER_ERROR = 50000,
    // UNAUTHORIZED = 401,
    // FORBIDDEN = 403,
    // BAD_REQUEST = 400,
    // UNPROCESSABLE_ENTITY = 422,
    // TOO_MANY_REQUESTS = 429,
    // SERVICE_UNAVAILABLE = 503,
}



export function errorHandler(fastify: FastifyInstance) {

    // 全局错误处理器
    fastify.setErrorHandler(async (error, request, reply) => {
        fastify.log.error({
            error: error.message,
            stack: error.stack,
            url: request.url,
            method: request.method,
            headers: request.headers,
            body: request.body,
        }, '🚨 全局错误处理器捕获到错误');

        // 根据错误类型返回不同的响应
        if (error.validation) {
            // Zod 验证错误
            return reply.status(403).send({
                msg: 'Zod Validation Error',
                data: error.validation,
                code: ERROR_CODE.ZOD_VALIDATION_ERROR,
            });
        }

        if (error.statusCode === 404) {
            // 404 错误
            return reply.status(404).send({
                msg: 'Not Found',
                data: null,
                code: ERROR_CODE.NOT_FOUND,
            });
        }

        if (error.statusCode && error.statusCode < 500) {
            // 客户端错误 (4xx)
            return reply.status(error.statusCode).send({
                msg: error.message || '客户端请求错误',
                data: null,
                code: error.statusCode,
            });
        }

        // 服务器内部错误 (5xx)
        return reply.status(500).send({
            msg: 'Internal Server Error',
            data: null,
            code: ERROR_CODE.INTERNAL_SERVER_ERROR,
        });
    });
} 
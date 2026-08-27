"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const reply = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Error interno del servidor.';
        let errors;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const response = exception.getResponse();
            if (typeof response === 'string') {
                message = response;
            }
            else if (typeof response === 'object' && response !== null) {
                const r = response;
                message = r['message'] ?? message;
                if (Array.isArray(message)) {
                    errors = { validation: message };
                    message = 'Error de validación.';
                }
            }
        }
        const isProduction = process.env.NODE_ENV === 'production';
        if (!isProduction && status >= 500) {
            this.logger.error(`${request.method} ${request.url} → ${status}`, exception instanceof Error ? exception.stack : String(exception));
        }
        void reply.status(status).send({
            statusCode: status,
            message,
            ...(errors && { errors }),
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map
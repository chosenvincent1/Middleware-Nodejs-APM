"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@opentelemetry/api");
const mongodb_1 = require("mongodb");
const enums_1 = require("./enums");
function startSpan(tracer, name, op, parentSpan) {
    return tracer.startSpan(`mongoose.${name}.${op}`, {
        kind: api_1.SpanKind.CLIENT,
        attributes: {
            [enums_1.AttributeNames.DB_MODEL_NAME]: name,
            [enums_1.AttributeNames.DB_TYPE]: 'nosql',
            [enums_1.AttributeNames.COMPONENT]: 'mongoose',
        },
        parent: parentSpan
    });
}
exports.startSpan = startSpan;
function handleExecResponse(execResponse, span, enhancedDatabaseReporting) {
    if (!(execResponse instanceof Promise)) {
        span.end();
        return execResponse;
    }
    return execResponse
        .then(response => {
        if (enhancedDatabaseReporting) {
            span.setAttribute(enums_1.AttributeNames.DB_RESPONSE, safeStringify(response));
        }
        return response;
    })
        .catch(handleError(span))
        .finally(() => span.end());
}
exports.handleExecResponse = handleExecResponse;
function handleError(span) {
    return function (error) {
        if (error instanceof mongodb_1.MongoError) {
            span.setAttribute(enums_1.AttributeNames.MONGO_ERROR_CODE, error.code);
        }
        setErrorStatus(span, error);
        return Promise.reject(error);
    };
}
exports.handleError = handleError;
function setErrorStatus(span, error) {
    if (error instanceof mongodb_1.MongoError) {
        span.setAttribute(enums_1.AttributeNames.MONGO_ERROR_CODE, error.code);
    }
    span.setStatus({
        code: api_1.CanonicalCode.UNKNOWN,
        message: error.message,
    });
    return span;
}
exports.setErrorStatus = setErrorStatus;
function safeStringify(payload) {
    try {
        return JSON.stringify(payload);
    }
    catch (_a) {
        return null;
    }
}
exports.safeStringify = safeStringify;
function getAttributesFromCollection(collection) {
    return {
        [enums_1.AttributeNames.COLLECTION_NAME]: collection.name,
        [enums_1.AttributeNames.DB_NAME]: collection.conn.name,
        [enums_1.AttributeNames.DB_HOST]: collection.conn.host,
        [enums_1.AttributeNames.DB_PORT]: collection.conn.port,
        [enums_1.AttributeNames.DB_USER]: collection.conn.user,
    };
}
exports.getAttributesFromCollection = getAttributesFromCollection;
//# sourceMappingURL=utils.js.map
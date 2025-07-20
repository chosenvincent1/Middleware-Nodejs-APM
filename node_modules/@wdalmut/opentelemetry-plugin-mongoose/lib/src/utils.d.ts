import { Tracer, Attributes } from '@opentelemetry/api';
import { Span } from '@opentelemetry/api';
import { MongoError } from 'mongodb';
export declare function startSpan(tracer: Tracer, name: string, op: string, parentSpan?: Span): Span;
export declare function handleExecResponse(execResponse: any, span: Span, enhancedDatabaseReporting?: boolean): any;
export declare function handleError(span: Span): (error: Error | MongoError) => Promise<MongoError>;
export declare function setErrorStatus(span: Span, error: MongoError | Error): Span;
export declare function safeStringify(payload: any): string | null;
export declare function getAttributesFromCollection(collection: any): Attributes;

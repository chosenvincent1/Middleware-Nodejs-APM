import { BasePlugin } from '@opentelemetry/core';
import mongoose from 'mongoose';
export declare const _STORED_PARENT_SPAN: unique symbol;
export declare class MongoosePlugin extends BasePlugin<typeof mongoose> {
    readonly moduleName: string;
    constructor(moduleName: string);
    protected patch(): typeof mongoose;
    private patchAggregateExec;
    private patchQueryExec;
    private patchOnModelMethods;
    private patchModelAggregate;
    private patchAndCaptureSpanContext;
    protected unpatch(): void;
}
export declare const plugin: MongoosePlugin;

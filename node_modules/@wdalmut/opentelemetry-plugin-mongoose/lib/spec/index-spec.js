"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const src_1 = require("../src");
const enums_1 = require("../src/enums");
const core_1 = require("@opentelemetry/core");
const node_1 = require("@opentelemetry/node");
const api_1 = require("@opentelemetry/api");
const mongoose_1 = __importDefault(require("mongoose"));
const logger = new core_1.NoopLogger();
const provider = new node_1.NodeTracerProvider();
const user_1 = __importDefault(require("./user"));
const api_2 = require("@opentelemetry/api");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const tracing_1 = require("@opentelemetry/tracing");
const asserts_1 = require("./asserts");
describe("mongoose opentelemetry plugin", () => {
    beforeAll(async (done) => {
        await mongoose_1.default.connect("mongodb://localhost:27017", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        });
        done();
    });
    afterAll(async (done) => {
        await mongoose_1.default.connection.close();
        done();
    });
    beforeEach(async (done) => {
        await user_1.default.insertMany([
            new user_1.default({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                age: 18,
            }),
            new user_1.default({
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane.doe@example.com',
                age: 19,
            }),
            new user_1.default({
                firstName: 'Michael',
                lastName: 'Fox',
                email: 'michael.fox@example.com',
                age: 16,
            })
        ]);
        user_1.default.createIndexes(() => {
            done();
        });
    });
    afterEach(async () => {
        await user_1.default.collection.drop();
    });
    describe("Trace", () => {
        let contextManager;
        const memoryExporter = new tracing_1.InMemorySpanExporter();
        const spanProcessor = new tracing_1.SimpleSpanProcessor(memoryExporter);
        provider.addSpanProcessor(spanProcessor);
        beforeAll(() => {
            src_1.plugin.enable(mongoose_1.default, provider, logger);
        });
        afterAll(() => {
            src_1.plugin.disable();
        });
        beforeEach(() => {
            memoryExporter.reset();
            contextManager = new context_async_hooks_1.AsyncHooksContextManager().enable();
            api_2.context.setGlobalContextManager(contextManager);
        });
        afterEach(() => {
            contextManager.disable();
        });
        it('should export a plugin', () => {
            expect(src_1.plugin instanceof src_1.MongoosePlugin).toBe(true);
        });
        it("instrumenting save operation", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                const user = new user_1.default({
                    firstName: 'Test first name',
                    lastName: 'Test last name',
                    email: 'test@example.com'
                });
                return user.save();
            }).then((user) => {
                const spans = memoryExporter.getFinishedSpans();
                expect(spans.length).toBe(1);
                asserts_1.assertSpan(spans[0]);
                expect(spans[0].status.code).toEqual(api_1.CanonicalCode.OK);
                expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('save');
                done();
            });
        });
        it("instrumenting save operation with callback", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                const user = new user_1.default({
                    firstName: 'Test first name',
                    lastName: 'Test last name',
                    email: 'test@example.com'
                });
                user.save(function (err) {
                    if (err) {
                        fail(err);
                        return done();
                    }
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].status.code).toEqual(api_1.CanonicalCode.OK);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('save');
                    done();
                });
            });
        });
        it("instrumenting error on save operation", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                const user = new user_1.default({
                    firstName: 'Test first name',
                    lastName: 'Test last name',
                    email: 'john.doe@example.com'
                });
                return user.save();
            })
                .then((user) => {
                fail(new Error("should not be possible"));
                done();
            })
                .catch((err) => {
                const spans = memoryExporter.getFinishedSpans();
                asserts_1.assertSpan(spans[0]);
                expect(spans[0].status.code).toEqual(api_1.CanonicalCode.UNKNOWN);
                expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                expect(spans[0].attributes[enums_1.AttributeNames.MONGO_ERROR_CODE]).toEqual(11000);
                expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('save');
                expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                done();
            });
        });
        it("instrumenting error on save operation with callbacks", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                const user = new user_1.default({
                    firstName: 'Test first name',
                    lastName: 'Test last name',
                    email: 'john.doe@example.com'
                });
                user.save(function (err) {
                    if (err) {
                        const spans = memoryExporter.getFinishedSpans();
                        expect(spans.length).toBe(1);
                        asserts_1.assertSpan(spans[0]);
                        expect(spans[0].status.code).toEqual(api_1.CanonicalCode.UNKNOWN);
                        expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                        expect(spans[0].attributes[enums_1.AttributeNames.MONGO_ERROR_CODE]).toEqual(11000);
                        expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                        expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('save');
                        expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                        return done();
                    }
                    fail(new Error("should not be possible"));
                    done();
                });
            });
        });
        it("instrumenting find operation", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.find({ id: "_test" })
                    .then((users) => {
                    const spans = memoryExporter.getFinishedSpans();
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('find');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"id":"_test"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    done();
                });
            });
        });
        it("instrumenting multiple find operations", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                Promise.all([user_1.default.find({ id: "_test1" }), user_1.default.find({ id: "_test2" })])
                    .then((users) => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(2);
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('find');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch(/^{"id":"_test[1-2]"}$/g);
                    expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    asserts_1.assertSpan(spans[1]);
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('find');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch(/^{"id":"_test[1-2]"}$/g);
                    expect(spans[1].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    done();
                });
            });
        });
        it("instrumenting find operation with chaining structures", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default
                    .find({ id: "_test" })
                    .skip(1)
                    .limit(2)
                    .sort({ email: 'asc' })
                    .then((users) => {
                    const spans = memoryExporter.getFinishedSpans();
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('find');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"id":"_test"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    done();
                });
            });
        });
        it('instrumenting remove operation [deprecated]', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.findOne({ email: 'john.doe@example.com' })
                    .then(user => user.remove())
                    .then(user => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('remove');
                    expect(spans[1].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    done();
                });
            });
        });
        it('instrumenting remove operation with callbacks [deprecated]', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, async () => {
                const user = await user_1.default.findOne({ email: 'john.doe@example.com' });
                user.remove((error, user) => {
                    expect(error).toBe(null);
                    expect(user).not.toBe(null);
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('remove');
                    expect(spans[1].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    done();
                });
            });
        });
        it('instrumenting deleteOne operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.deleteOne({ email: 'john.doe@example.com' })
                    .then(op => {
                    expect(op.deletedCount).toBe(1);
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('deleteOne');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"email":"john.doe@example.com"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toBe(undefined);
                    done();
                });
            });
        });
        it('instrumenting updateOne operation on models', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.findOne({ email: 'john.doe@example.com' })
                    .then(user => user.updateOne({ $inc: { age: 1 } }, { w: 1 }))
                    .then(user => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('updateOne');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch(/{"_id":"\w+"}/);
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{"w":1}');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual('{"$inc":{"age":1}}');
                    expect(spans[1].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                    done();
                });
            });
        });
        it('instrumenting updateOne operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.updateOne({ email: 'john.doe@example.com' }, { $inc: { age: 1 } })
                    .then(user => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('updateOne');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"email":"john.doe@example.com"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual('{"$inc":{"age":1}}');
                    done();
                });
            });
        });
        it('instrumenting count operation [deprecated]', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.count({})
                    .then(users => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('count');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it('instrumenting countDocuments operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.countDocuments({})
                    .then(users => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('countDocuments');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it('instrumenting estimatedDocumentCount operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.estimatedDocumentCount({})
                    .then(users => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('estimatedDocumentCount');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it('instrumenting deleteMany operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.deleteMany({})
                    .then(users => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('deleteMany');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it('instrumenting findOne operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.findOne({ email: 'john.doe@example.com' })
                    .then(user => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('findOne');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('{"email":"john.doe@example.com"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it('instrumenting update operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.update({ email: 'john.doe@example.com' }, { email: 'john.doe2@example.com' })
                    .then(user => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('update');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"email":"john.doe@example.com"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual('{"email":"john.doe2@example.com"}');
                    done();
                });
            });
        });
        it('instrumenting updateMany operation', async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.updateMany({ age: 18 }, { isDeleted: true })
                    .then(user => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('updateMany');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"age":18}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual('{"isDeleted":true}');
                    done();
                });
            });
        });
        it(`instrumenting findOneAndDelete operation`, async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.findOneAndDelete({ email: "john.doe@example.com" })
                    .then(() => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('findOneAndDelete');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"email":"john.doe@example.com"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it(`instrumenting findOneAndUpdate operation`, async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.findOneAndUpdate({ email: "john.doe@example.com" }, { isUpdated: true })
                    .then(() => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(2);
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('findOneAndUpdate');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"email":"john.doe@example.com"}');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual('{"isUpdated":true}');
                    done();
                });
            });
        });
        it(`instrumenting findOneAndRemove operation`, async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.findOneAndRemove({ email: "john.doe@example.com" })
                    .then(() => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('findOneAndRemove');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"email":"john.doe@example.com"}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_OPTIONS]).toEqual('{}');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_UPDATE]).toEqual(undefined);
                    done();
                });
            });
        });
        it(`instrumenting create operation`, async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.create({ firstName: 'John', lastName: 'Doe', email: "john.doe+1@example.com" })
                    .then(() => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].status.code).toEqual(api_1.CanonicalCode.OK);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_STATEMENT]).toMatch('');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('save');
                    done();
                });
            });
        });
        it('instrumenting aggregate operation', async (done) => {
            const span = provider.getTracer("default").startSpan("test span");
            provider.getTracer("default").withSpan(span, () => {
                user_1.default.aggregate([
                    { $match: { firstName: "John" } },
                    { $group: { _id: "John", total: { $sum: "$amount" } } },
                ]).then(() => {
                    const spans = memoryExporter.getFinishedSpans();
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual("User");
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual("aggregate");
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_AGGREGATE_PIPELINE]).toEqual('[{"$match":{"firstName":"John"}},{"$group":{"_id":"John","total":{"$sum":"$amount"}}}]');
                    expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual("users");
                    done();
                });
            });
        });
        it('instrumenting aggregate with callback', async (done) => {
            const span = provider.getTracer("default").startSpan("test span");
            provider.getTracer("default").withSpan(span, () => {
                user_1.default.aggregate([
                    { $match: { firstName: "John" } },
                    { $group: { _id: "John", total: { $sum: "$amount" } } },
                ], (error, result) => {
                    expect(error).toBe(null);
                    expect(result).not.toBe(null);
                    const spans = memoryExporter.getFinishedSpans();
                    asserts_1.assertSpan(spans[0]);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual("User");
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual("aggregate");
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_AGGREGATE_PIPELINE]).toEqual('[{"$match":{"firstName":"John"}},{"$group":{"_id":"John","total":{"$sum":"$amount"}}}]');
                    expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual("users");
                    done();
                });
            });
        });
        it('instrumenting aggregate with await', async (done) => {
            const span = provider.getTracer("default").startSpan("test span");
            provider.getTracer("default").withSpan(span, async () => {
                await user_1.default.aggregate([
                    { $match: { firstName: "John" } },
                    { $group: { _id: "John", total: { $sum: "$amount" } } },
                ]);
                const spans = memoryExporter.getFinishedSpans();
                // check linked to parent span correctly
                expect(spans[0].parentSpanId).toBe(span.context().spanId);
                asserts_1.assertSpan(spans[0]);
                expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual("User");
                expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual("aggregate");
                expect(spans[0].attributes[enums_1.AttributeNames.DB_AGGREGATE_PIPELINE]).toEqual('[{"$match":{"firstName":"John"}},{"$group":{"_id":"John","total":{"$sum":"$amount"}}}]');
                expect(spans[0].attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual("users");
                done();
            });
        });
        it("await on mongoose thenable query object", async (done) => {
            const initSpan = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(initSpan, async () => {
                await user_1.default.findOne({ id: "_test" });
                const spans = memoryExporter.getFinishedSpans();
                expect(spans.length).toBe(1);
                const mongooseSpan = spans[0];
                // validate the the mongoose span is the child of the span the initiated the call
                expect(mongooseSpan.spanContext.traceId).toEqual(initSpan.context().traceId);
                expect(mongooseSpan.parentSpanId).toEqual(initSpan.context().spanId);
                asserts_1.assertSpan(mongooseSpan);
                expect(mongooseSpan.attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                expect(mongooseSpan.attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('findOne');
                expect(mongooseSpan.attributes[enums_1.AttributeNames.DB_STATEMENT]).toEqual('{"id":"_test"}');
                expect(mongooseSpan.attributes[enums_1.AttributeNames.COLLECTION_NAME]).toEqual('users');
                done();
            });
        });
        it("instrumenting combined operation with Promise.all", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                Promise.all([
                    user_1.default
                        .find({ id: "_test" })
                        .skip(1)
                        .limit(2)
                        .sort({ email: 'asc' }),
                    user_1.default.countDocuments()
                ])
                    .then((users) => {
                    // close the root span
                    span.end();
                    const spans = memoryExporter.getFinishedSpans();
                    // same traceId assertion
                    expect([...new Set(spans.map((span) => span.spanContext.traceId))].length).toBe(1);
                    expect(spans.length).toBe(3);
                    asserts_1.assertSpan(spans[0]);
                    asserts_1.assertSpan(spans[1]);
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toMatch(/^(find|countDocuments)$/g);
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                    expect(spans[1].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toMatch(/^(find|countDocuments)$/g);
                    done();
                });
            });
        });
        it("instrumenting combined operation with async/await", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, async () => {
                await user_1.default.find({ id: "_test" }).skip(1).limit(2).sort({ email: 'asc' });
                // close the root span
                span.end();
                const spans = memoryExporter.getFinishedSpans();
                expect(spans.length).toBe(2);
                // same traceId assertion
                expect([...new Set(spans.map((span) => span.spanContext.traceId))].length).toBe(1);
                asserts_1.assertSpan(spans[0]);
                expect(spans[0].attributes[enums_1.AttributeNames.DB_MODEL_NAME]).toEqual('User');
                expect(spans[0].attributes[enums_1.AttributeNames.DB_QUERY_TYPE]).toEqual('find');
                done();
            });
        });
    });
    describe("Trace with enhancedDatabaseReporting", () => {
        let contextManager;
        const memoryExporter = new tracing_1.InMemorySpanExporter();
        const spanProcessor = new tracing_1.SimpleSpanProcessor(memoryExporter);
        provider.addSpanProcessor(spanProcessor);
        beforeAll(() => {
            src_1.plugin.enable(mongoose_1.default, provider, logger, { enhancedDatabaseReporting: true });
        });
        afterAll(() => {
            src_1.plugin.disable();
        });
        beforeEach(() => {
            memoryExporter.reset();
            contextManager = new context_async_hooks_1.AsyncHooksContextManager().enable();
            api_2.context.setGlobalContextManager(contextManager);
        });
        afterEach(() => {
            contextManager.disable();
        });
        it(`Save operation traces save data`, async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                const payload = { firstName: 'John', lastName: 'Doe', email: "john.doe+1@example.com" };
                user_1.default.create(payload)
                    .then((user) => {
                    const spans = memoryExporter.getFinishedSpans();
                    expect(spans.length).toBe(1);
                    asserts_1.assertSpan(spans[0]);
                    const saveData = JSON.parse(spans[0].attributes[enums_1.AttributeNames.DB_SAVE]);
                    expect(saveData.firstName).toBe(payload.firstName);
                    expect(saveData.lastName).toBe(payload.lastName);
                    expect(saveData.email).toBe(payload.email);
                    expect(saveData._id).toBeDefined();
                    done();
                });
            });
        });
        it("find operation traces query response", async (done) => {
            const span = provider.getTracer('default').startSpan('test span');
            provider.getTracer('default').withSpan(span, () => {
                user_1.default.find({})
                    .then((users) => {
                    const spans = memoryExporter.getFinishedSpans();
                    asserts_1.assertSpan(spans[0]);
                    expect(JSON.stringify(users)).toEqual(spans[0].attributes[enums_1.AttributeNames.DB_RESPONSE]);
                    done();
                });
            });
        });
    });
});
//# sourceMappingURL=index-spec.js.map
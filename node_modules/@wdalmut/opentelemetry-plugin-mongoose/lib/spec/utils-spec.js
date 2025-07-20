"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../src/utils");
describe('utils', () => {
    describe('safeStringify', () => {
        it('Stringify as expected', () => {
            const stringified = utils_1.safeStringify({ hello: 'world' });
            expect(stringified).toBe('{"hello":"world"}');
        });
        it('Fails to stringify a circular object and returns null', () => {
            const obj = { a: 1 };
            obj.b = obj;
            const stringified = utils_1.safeStringify(obj);
            expect(stringified).toBe(null);
        });
    });
});
//# sourceMappingURL=utils-spec.js.map
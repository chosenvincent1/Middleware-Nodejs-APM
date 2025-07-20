"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../src/enums");
function assertSpan(span) {
    expect(span.attributes[enums_1.AttributeNames.COMPONENT]).toEqual('mongoose');
    expect(span.attributes[enums_1.AttributeNames.DB_TYPE]).toEqual('nosql');
    expect(span.attributes[enums_1.AttributeNames.DB_HOST]).toEqual('localhost');
    expect(span.attributes[enums_1.AttributeNames.DB_PORT]).toEqual(27017);
    expect(span.attributes[enums_1.AttributeNames.DB_USER]).toEqual(undefined);
}
exports.assertSpan = assertSpan;
//# sourceMappingURL=asserts.js.map
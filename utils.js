"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizePages = exports.parseType = exports.DataType = void 0;
var uuid_1 = __importDefault(require("uuid"));
// @ts-ignore
var text_decoding_1 = require("text-decoding");
var DataType;
(function (DataType) {
    DataType[DataType["Boolean"] = 1] = "Boolean";
    DataType[DataType["Int8"] = 2] = "Int8";
    DataType[DataType["Int16"] = 3] = "Int16";
    DataType[DataType["Int32"] = 4] = "Int32";
    DataType[DataType["Money"] = 5] = "Money";
    DataType[DataType["Float32"] = 6] = "Float32";
    DataType[DataType["Float64"] = 7] = "Float64";
    DataType[DataType["DateTime"] = 8] = "DateTime";
    DataType[DataType["Binary"] = 9] = "Binary";
    DataType[DataType["Text"] = 10] = "Text";
    DataType[DataType["OLE"] = 11] = "OLE";
    DataType[DataType["Memo"] = 12] = "Memo";
    DataType[DataType["GUID"] = 15] = "GUID";
    DataType[DataType["Bit96Bytes17"] = 16] = "Bit96Bytes17";
    DataType[DataType["Complex"] = 18] = "Complex";
})(DataType || (exports.DataType = DataType = {}));
var TABLE_PAGE_MAGIC = Buffer.from([0x02, 0x01]);
var DATA_PAGE_MAGIC = Buffer.from([0x01, 0x01]);
var parseType = function (dataType, buffer, length, version) {
    if (version === void 0) { version = 3; }
    var parsed = '';
    var buf;
    switch (dataType) {
        case DataType.Int8:
            parsed = buffer.readInt8(0);
            break;
        case DataType.Int16:
            parsed = buffer.readInt16LE(0);
            break;
        case DataType.Int32:
        case DataType.Complex:
            parsed = buffer.readInt32LE(0);
            break;
        case DataType.Float32:
            parsed = buffer.readFloatLE(0);
            break;
        case DataType.Float64:
            parsed = buffer.readDoubleLE(0);
            break;
        case DataType.Money:
            parsed =
                buffer.readUInt32LE(0) + buffer.readUInt32LE(4) * Math.pow(0x10, 8);
            break;
        case DataType.DateTime:
            var daysPassed = Math.floor(buffer.readDoubleLE(0));
            // ms access expresses hours in decimals
            var hoursPassedDecimal = buffer.readDoubleLE(0) % 1;
            var hours = Math.floor(hoursPassedDecimal * 24);
            var minutes = Math.floor(((hoursPassedDecimal * 24) % 1) * 60);
            var seconds = Math.floor(((((hoursPassedDecimal * 24) % 1) * 60) % 1) * 60);
            var date = new Date('1899/12/30');
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() + daysPassed);
            date.setHours(hours, minutes, seconds);
            // todo check TIME ZONE
            parsed = date.toISOString();
            break;
        case DataType.Binary:
            parsed = buffer.slice(0, length).toString('utf8'); // Maybe
            break;
        case DataType.GUID:
            parsed = uuid_1.default.stringify(buffer.slice(0, 16));
            break;
        case DataType.Bit96Bytes17:
            parsed = buffer.slice(0, 17).toString('utf8'); // Maybe
            break;
        case DataType.Text:
            if (version > 3) {
                var first = Buffer.compare(buffer.slice(0, 2), Buffer.from([0xfe, 0xff])) === 0;
                var second = Buffer.compare(buffer.slice(0, 2), Buffer.from([0xff, 0xfe])) === 0;
                if (first || second) {
                    parsed = new text_decoding_1.TextDecoder('utf-8').decode(buffer.slice(2));
                }
                else {
                    parsed = new text_decoding_1.TextDecoder('utf-16le').decode(buffer);
                }
            }
            else {
                parsed = buffer.toString('utf8');
            }
            break;
    }
    return parsed;
};
exports.parseType = parseType;
var categorizePages = function (dbData, pageSize) {
    if (dbData.length % pageSize)
        throw new Error("DB is not full or pageSize is wrong. pageSize: ".concat(pageSize, " dbData.length: ").concat(dbData.length));
    var pages = {};
    for (var i = 0; i < dbData.length; i += pageSize)
        pages[i] = dbData.slice(i, i + pageSize);
    var dataPages = {};
    var tableDefs = {};
    for (var _i = 0, _a = Object.keys(pages); _i < _a.length; _i++) {
        var page = _a[_i];
        var comp1 = Buffer.compare(DATA_PAGE_MAGIC, pages[page].slice(0, DATA_PAGE_MAGIC.length)) === 0;
        var comp2 = Buffer.compare(TABLE_PAGE_MAGIC, pages[page].slice(0, TABLE_PAGE_MAGIC.length)) === 0;
        if (comp1)
            dataPages[page] = pages[page];
        else if (comp2)
            tableDefs[page] = pages[page];
    }
    return [tableDefs, dataPages, pages];
};
exports.categorizePages = categorizePages;
//# sourceMappingURL=utils.js.map
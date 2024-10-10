"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRelativeObjectMetadataStruct = exports.parseDataPageHeader = exports.parseTableData = exports.parseTableHead = exports.TDEF_HEADER = exports.MEMO = exports.ACCESSHEADER = void 0;
var binary_parser_1 = require("binary-parser");
// @ts-ignore
var text_decoding_1 = require("text-decoding");
binary_parser_1.Parser.prototype.array = (function (oldArray) {
    return function (varName, options) {
        if (options.length === 0)
            return this.setNextParser('array', varName, options);
        return oldArray.call(this, varName, options);
    };
})(binary_parser_1.Parser.prototype.array);
exports.ACCESSHEADER = new binary_parser_1.Parser()
    .seek(4)
    .string('jetString', {
    zeroTerminated: true,
})
    .uint32le('jetVersion')
    .seek(126);
exports.MEMO = new binary_parser_1.Parser()
    .uint32le('memoLength')
    .uint32le('recordPointer')
    .uint32le('memoUnknown')
    .saveOffset('memoEnd');
var VERSION_3_FLAGS = new binary_parser_1.Parser()
    .bit1('hyperlink')
    .bit1('autoGUID')
    .bit1('unk1')
    .bit1('replication')
    .bit1('unk2')
    .bit1('autonumber')
    .bit1('canBeNull')
    .bit1('fixedLength');
var VERSION_4_FLAGS = new binary_parser_1.Parser()
    .bit1('hyperlink')
    .bit1('autoGUID')
    .bit1('unk1')
    .bit1('replication')
    .bit1('unk2')
    .bit1('autonumber')
    .bit1('canBeNull')
    .bit1('fixedLength')
    .bit1('unk3')
    .bit1('unk4')
    .bit1('unk5')
    .bit1('modernPackageType')
    .bit1('unk6')
    .bit1('unk7')
    .bit1('unk8')
    .bit1('compressedUnicode');
exports.TDEF_HEADER = new binary_parser_1.Parser()
    .seek(2)
    .uint16le('peekVersion')
    .seek(-2)
    .uint16le('tdefVer')
    .uint32le('nextPagePtr')
    .saveOffset('headerEnd');
var parseTableHead = function (buffer, version) {
    if (version === void 0) { version = 3; }
    return (new binary_parser_1.Parser()
        .nest('TDEF_header', { type: exports.TDEF_HEADER })
        .uint32le('tableDefinitionLength')
        // Conditional
        .uint32le('ver4Unknown')
        .seek(version > 3 ? 0 : -4)
        .uint32le('numberOfRows')
        .uint32le('autonumber')
        // Conditional
        .uint32le('autonumberIncrement')
        .seek(version > 3 ? 0 : -4)
        // Conditional
        .uint32le('complexAutonumber')
        .seek(version > 3 ? 0 : -4)
        // Conditional
        .uint32le('ver4Unknown1')
        .seek(version > 3 ? 0 : -4)
        // Conditional
        .uint32le('ver4Unknown2')
        .seek(version > 3 ? 0 : -4)
        .uint8('tableTypeFlags')
        .uint16le('nextColumnID')
        .uint16le('variableColumns')
        .uint16le('columnCount')
        .uint32le('indexCount')
        .uint32le('realIndexCount')
        .uint32le('rowPageMap')
        .uint32le('freeSpacePageMap')
        .saveOffset('tDefHeaderEnd')
        .parse(buffer));
};
exports.parseTableHead = parseTableHead;
var parseTableData = function (buffer, realIndexCount, columnCount, version) {
    if (version === void 0) { version = 3; }
    var REAL_INDEX = new binary_parser_1.Parser()
        .uint32le('unk1')
        .uint32le('indexRowCount')
        .seek(version > 3 ? 0 : -4)
        // Conditional
        .uint32le('ver4AlwaysZero');
    var VARIOUS_TEXT_V3 = new binary_parser_1.Parser()
        .uint16le('LCID')
        .uint16le('codePage')
        .uint16le('variousText3Unknown');
    var VARIOUS_TEXT_V4 = new binary_parser_1.Parser()
        .uint16le('collation')
        .uint8('variousText4Unknown')
        .uint8('collationVersionNumber');
    var VARIOUS_TEXT = version === 3 ? VARIOUS_TEXT_V3 : VARIOUS_TEXT_V4;
    var VARIOUS_DEC_V3 = new binary_parser_1.Parser()
        .uint16le('variousDec3Unknown')
        .uint8('maxNumberOfDigits')
        .uint8('numberOfDecimal')
        .uint16le('variousDec3Unknown2');
    var VARIOUS_DEC_V4 = new binary_parser_1.Parser()
        .uint8('maxNumOfDigits')
        .uint8('numOfDecimalDigits')
        .uint16le('variousDec4Unknown');
    var VARIOUS_DEC = version === 3 ? VARIOUS_DEC_V3 : VARIOUS_DEC_V4;
    var COLUMN = new binary_parser_1.Parser()
        .uint8('type')
        // Conditional
        .uint32le('ver4Unknown3')
        .seek(version > 3 ? 0 : -4)
        .uint16le('columnID')
        .uint16le('variableColumnNumber')
        .uint16le('columnIndex')
        .choice('various', {
        tag: 'type',
        choices: {
            1: VARIOUS_DEC,
            2: VARIOUS_DEC,
            3: VARIOUS_DEC,
            4: VARIOUS_DEC,
            5: VARIOUS_DEC,
            6: VARIOUS_DEC,
            7: VARIOUS_DEC,
            8: VARIOUS_DEC,
            9: VARIOUS_TEXT,
            10: VARIOUS_TEXT,
            11: VARIOUS_TEXT,
            12: VARIOUS_TEXT,
        },
        defaultChoice: new binary_parser_1.Parser().seek(version === 3 ? 6 : 4),
    })
        .choice('columnFlags', {
        tag: new Function("return ".concat(version === 3 ? 1 : 0)),
        choices: {
            1: VERSION_3_FLAGS,
            0: VERSION_4_FLAGS,
        },
    })
        // Conditional
        .uint32le('ver4Unknown4')
        .seek(version > 3 ? 0 : -4)
        .uint16le('fixedOffset')
        .uint16le('length');
    var COLUMN_NAMES_V3 = new binary_parser_1.Parser()
        .uint8('colNamesLen')
        .string('colNameStr', {
        length: 'colNamesLen',
        encoding: 'utf8',
        stripNull: true,
    });
    var COLUMN_NAMES_V4 = new binary_parser_1.Parser()
        .uint16le('colNamesLen')
        .buffer('colNameStr', {
        length: 'colNamesLen',
    });
    // .string("colNameStr", {
    // 	length: "colNamesLen",
    // 	encoding: "utf16",
    // 	stripNull: true,
    // });
    var COLUMN_NAMES = version === 3 ? COLUMN_NAMES_V3 : COLUMN_NAMES_V4;
    var res = new binary_parser_1.Parser()
        .array('readIndex', {
        length: realIndexCount,
        type: REAL_INDEX,
    })
        .array('column', {
        length: columnCount,
        type: COLUMN,
    })
        .array('columnNames', {
        length: columnCount,
        type: COLUMN_NAMES,
    })
        .parse(buffer);
    if (version !== 3) {
        for (var _i = 0, _a = res.columnNames; _i < _a.length; _i++) {
            var columnName = _a[_i];
            var buffer_1 = columnName.colNameStr;
            columnName.colNameStr = new text_decoding_1.TextDecoder('utf-16le').decode(buffer_1);
        }
    }
    return res;
};
exports.parseTableData = parseTableData;
var parseDataPageHeader = function (buffer, version) {
    if (version === void 0) { version = 3; }
    return (new binary_parser_1.Parser()
        .seek(2)
        .uint16le('dataFreeSpace')
        .uint32le('owner')
        .seek(version > 3 ? 0 : -4)
        // Conditional
        .uint32le('ver4UnknownData')
        .uint16le('recordCount')
        .array('recordOffsets', {
        length: 'recordCount',
        type: 'uint16le',
    })
        .parse(buffer));
};
exports.parseDataPageHeader = parseDataPageHeader;
var parseRelativeObjectMetadataStruct = function (buffer, variableJumpTablesCNT, version) {
    if (variableJumpTablesCNT === void 0) { variableJumpTablesCNT = 0; }
    if (version === void 0) { version = 3; }
    if (version === 3) {
        return new binary_parser_1.Parser()
            .uint8('variableLengthFieldCount')
            .array('variableLengthJumpTable', {
            length: variableJumpTablesCNT,
            type: 'uint8',
        })
            .array('variableLengthFieldOffsets', {
            length: function () {
                return this.variableLengthFieldCount;
            },
            type: 'uint8',
        })
            .uint8('varLenCount')
            .saveOffset('relativeMetadataEnd')
            .parse(buffer);
    }
    else {
        var part1 = new binary_parser_1.Parser()
            .uint16le('variableLengthFieldCount')
            .array('variableLengthJumpTable', {
            length: variableJumpTablesCNT,
            type: 'uint8',
        })
            .saveOffset('part2StartOffset')
            .parse(buffer);
        var part2 = new binary_parser_1.Parser()
            .array('variableLengthFieldOffsets', {
            length: (part1.variableLengthFieldCount & 0xff) >>> 0,
            type: 'uint16le',
        })
            .uint16le('varLenCount')
            .saveOffset('relativeMetadataEnd')
            .parse(buffer.slice(part1.part2StartOffset));
        var result = __assign(__assign({}, part1), part2);
        return result;
    }
};
exports.parseRelativeObjectMetadataStruct = parseRelativeObjectMetadataStruct;
//# sourceMappingURL=parsing-primitives.js.map
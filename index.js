"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessParser = void 0;
var utils_1 = require("./utils");
var parsing_primitives_1 = require("./parsing-primitives");
var PAGE_SIZE_V3 = 0x800;
var PAGE_SIZE_V4 = 0x1000;
// Versions
var VERSION_3 = 0x00;
var VERSION_4 = 0x01;
var VERSION_5 = 0x02;
var VERSION_2010 = 0x03;
var ALL_VERSIONS;
(function (ALL_VERSIONS) {
    ALL_VERSIONS[ALL_VERSIONS["VERSION_3"] = 3] = "VERSION_3";
    ALL_VERSIONS[ALL_VERSIONS["VERSION_4"] = 4] = "VERSION_4";
    ALL_VERSIONS[ALL_VERSIONS["VERSION_5"] = 5] = "VERSION_5";
    ALL_VERSIONS[ALL_VERSIONS["VERSION_2010"] = 2010] = "VERSION_2010";
})(ALL_VERSIONS || (ALL_VERSIONS = {}));
var NEW_VERSIONS = [VERSION_4, VERSION_5, VERSION_2010];
var SYSTEM_TABLE_FLAGS = [-0x80000000, -0x00000002, 0x80000000, 0x00000002];
var TableObject = /** @class */ (function () {
    function TableObject(_offset, value) {
        // private offset: number;
        this.linkedPages = [];
        this.value = value;
        // this.offset = offset;
        this.linkedPages = [];
    }
    return TableObject;
}());
var AccessParser = /** @class */ (function () {
    function AccessParser(dbData) {
        var _a;
        this.version = ALL_VERSIONS.VERSION_3;
        this.pageSize = PAGE_SIZE_V3;
        this.dbData = dbData;
        this.parseFileHeader();
        _a = (0, utils_1.categorizePages)(this.dbData, this.pageSize), this.tableDefs = _a[0], this.dataPages = _a[1] /*this.allPages*/;
        this.tablesWithData = this.linkTablesToData();
        this.catalog = this.parseCatalog();
    }
    AccessParser.prototype.parseFileHeader = function () {
        var head;
        try {
            head = parsing_primitives_1.ACCESSHEADER.parse(this.dbData);
        }
        catch (_a) {
            throw new Error('Failed to parse DB file header. Check it is a valid file header');
        }
        var version = head.jetVersion;
        if (NEW_VERSIONS.includes(version)) {
            if (version === VERSION_4)
                this.version = ALL_VERSIONS.VERSION_4;
            else if (version === VERSION_5)
                this.version = ALL_VERSIONS.VERSION_5;
            else if (version === VERSION_2010)
                this.version = ALL_VERSIONS.VERSION_2010;
            this.pageSize = PAGE_SIZE_V4;
        }
        else if (version !== VERSION_3) {
            throw new Error("Unknown database version ".concat(version, " Trying to parse database as version 3"));
        }
    };
    AccessParser.prototype.linkTablesToData = function () {
        var tablesWithData = {};
        for (var _i = 0, _a = Object.keys(this.dataPages); _i < _a.length; _i++) {
            var i = _a[_i];
            var data = this.dataPages[i];
            var parsedDP = void 0;
            try {
                parsedDP = (0, parsing_primitives_1.parseDataPageHeader)(data, this.version);
            }
            catch (_b) {
                console.error("Failed to parse data page ".concat(data));
                continue;
            }
            var pageOffset = parsedDP.owner * this.pageSize;
            if (Object.keys(this.tableDefs)
                .map(function (str) { return parseInt(str); })
                .includes(pageOffset)) {
                var tablePageValue = this.tableDefs[pageOffset];
                if (!Object.keys(tablesWithData).includes(pageOffset.toString()))
                    tablesWithData[pageOffset] = new TableObject(pageOffset, tablePageValue);
                tablesWithData[pageOffset].linkedPages.push(data);
            }
        }
        return tablesWithData;
    };
    AccessParser.prototype.parseCatalog = function () {
        var catalogPage = this.tablesWithData[2 * this.pageSize];
        var accessTable = new AccessTable(catalogPage, this.version, this.pageSize, this.dataPages, this.tableDefs);
        var catalog = accessTable.parse();
        var tablesMapping = {};
        var i = -1;
        var names = catalog['Name'];
        var types = catalog['Type'];
        var flags = catalog['Flags'];
        var ids = catalog['Id'];
        if (names === undefined ||
            types === undefined ||
            flags === undefined ||
            ids === undefined)
            throw new Error('The catalog is missing required fields');
        for (var _i = 0, names_1 = names; _i < names_1.length; _i++) {
            var tableName = names_1[_i];
            if (typeof tableName !== 'string')
                continue;
            i += 1;
            var tableType = 1;
            if (types[i] === tableType) {
                if (!SYSTEM_TABLE_FLAGS.includes(flags[i]) && flags[i] === 0) {
                    // TODO: CHECK IF 0 IS THE RIGHT FLAG TO SET
                    // console.log(tableName);
                    // console.log(flags[i]);
                    tablesMapping[tableName] = ids[i];
                }
            }
        }
        return tablesMapping;
    };
    AccessParser.prototype.parseTableUnformatted = function (tableName) {
        var tableOffset = this.catalog[tableName];
        if (tableOffset === undefined)
            throw new Error("Could not find table ".concat(tableName, " in Database"));
        tableOffset *= this.pageSize;
        var table = this.tablesWithData[tableOffset];
        if (table === undefined) {
            var tableDef = this.tableDefs[tableOffset];
            if (tableDef === undefined) {
                throw new Error("Could not find table ".concat(tableName, " offset ").concat(tableOffset));
            }
            else {
                throw new Error('Empty table');
                // table = new TableObject(tableOffset, tableDef);
            }
        }
        var accessTable = new AccessTable(table, this.version, this.pageSize, this.dataPages, this.tableDefs);
        return accessTable.parse();
    };
    AccessParser.prototype.parseTable = function (name) {
        var table = this.parseTableUnformatted(name);
        var fields = Object.keys(table);
        if (fields.length === 0) {
            return [];
        }
        var linesNumber = table[fields[0]].length;
        var lines = [];
        for (var i = 0; i < linesNumber; ++i) {
            var line = {};
            for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
                var field = fields_1[_i];
                line[field] = table[field][i];
            }
            lines.push({ data: line, rowNumber: i + 1 });
        }
        return lines;
    };
    AccessParser.prototype.getTables = function () {
        return Object.keys(this.catalog);
    };
    AccessParser.prototype.getVersion = function () {
        return this.version;
    };
    return AccessParser;
}());
exports.AccessParser = AccessParser;
var AccessTable = /** @class */ (function () {
    function AccessTable(table, version, pageSize, dataPages, tableDefs) {
        var _a;
        this.version = version;
        this.pageSize = pageSize;
        this.dataPages = dataPages;
        this.tableDefs = tableDefs;
        this.table = table;
        this.parsedTable = {};
        _a = this.getTableColumns(), this.columns = _a[0], this.tableHeader = _a[1];
    }
    AccessTable.prototype.getTableColumns = function () {
        var tableHeader;
        var colNames;
        var columns;
        try {
            tableHeader = (0, parsing_primitives_1.parseTableHead)(this.table.value, this.version);
            var mergedData = this.table.value.slice(tableHeader.tDefHeaderEnd);
            if (tableHeader.TDEF_header.nextPagePtr) {
                mergedData = Buffer.concat([
                    mergedData,
                    this.mergeTableData(tableHeader.TDEF_header.nextPagePtr),
                ]);
            }
            var parsedData = (0, parsing_primitives_1.parseTableData)(mergedData, tableHeader.realIndexCount, tableHeader.columnCount, this.version);
            columns = parsedData.column;
            colNames = parsedData.columnNames;
            // REMOVE FOR NOW
            // (tableHeader as any).column = parsedData.column;
            // (tableHeader as any).columnNames = parsedData.columnNames;
        }
        catch (err) {
            throw new Error("Failed to parse table header");
        }
        // const colNames = tableHeader.columnNames;
        // const columns = tableHeader.column;
        columns.forEach(function (c, i) {
            c.colNameStr = colNames[i].colNameStr;
        });
        var offset = Math.min.apply(Math, columns.map(function (c) { return c.columnIndex; }));
        var columnDict = {};
        for (var _i = 0, columns_1 = columns; _i < columns_1.length; _i++) {
            var x = columns_1[_i];
            columnDict[x.columnIndex - offset] = x;
        }
        if (Object.keys(columnDict).length !== columns.length) {
            for (var _a = 0, columns_2 = columns; _a < columns_2.length; _a++) {
                var x = columns_2[_a];
                columnDict[x.columnID] = x;
            }
        }
        if (Object.keys(columnDict).length !== tableHeader.columnCount)
            throw new Error("Expected ".concat(tableHeader.columnCount, " columns got ").concat(Object.keys(columnDict).length));
        return [columnDict, tableHeader];
    };
    AccessTable.prototype.mergeTableData = function (firstPage) {
        var table = this.tableDefs[firstPage * this.pageSize];
        var parsedHeader = parsing_primitives_1.TDEF_HEADER.parse(table);
        var data = table.slice(parsedHeader.headerEnd);
        while (parsedHeader.nextPagePtr) {
            table = this.tableDefs[parsedHeader.nextPagePtr * this.pageSize];
            parsedHeader = parsing_primitives_1.TDEF_HEADER.parse(table);
            data = Buffer.concat([data, table.slice(parsedHeader.headerEnd)]);
        }
        return data;
    };
    AccessTable.prototype.createEmptyTable = function () {
        var parsedTable = {};
        var columns = this.getTableColumns()[0];
        for (var _i = 0, _a = Object.keys(columns); _i < _a.length; _i++) {
            var i = _a[_i];
            var column = columns[i];
            parsedTable[column.colNameStr] = [];
        }
        return parsedTable;
    };
    AccessTable.prototype.getOverflowRecord = function (recordPointer) {
        var recordOffset = (recordPointer & 0xff) >>> 0;
        var pageNum = recordPointer >>> 8;
        var recordPage = this.dataPages[pageNum * this.pageSize];
        if (!recordPage)
            return;
        var parsedData = (0, parsing_primitives_1.parseDataPageHeader)(recordPage, this.version);
        if (recordOffset > parsedData.recordOffsets.length)
            return;
        var start = parsedData.recordOffsets[recordOffset];
        if ((start & 0x8000) >>> 0)
            start = (start & 0xfff) >>> 0;
        else
            console.log("Overflow record flag is not present ".concat(start));
        var record;
        if (recordOffset === 0) {
            record = recordPage.slice(start);
        }
        else {
            var end = parsedData.recordOffsets[recordOffset - 1];
            if ((end & 0x8000) >>> 0)
                end = (end & 0xfff) >>> 0;
            record = recordPage.slice(start, end);
        }
        return record;
    };
    AccessTable.prototype.parseFixedLengthData = function (originalRecord, column, nullTable) {
        var columnName = column.colNameStr;
        var parsedType;
        if (column.type === utils_1.DataType.Boolean) {
            if (column.columnID > nullTable.length)
                throw new Error("Failed to parse bool field, Column not found in nullTable column: ".concat(columnName, ", column id: ").concat(column.columnID, ", nullTable: ").concat(nullTable));
            parsedType = nullTable[column.columnID];
        }
        else {
            if (column.fixedOffset > originalRecord.length)
                throw new Error("Column offset is bigger than the length of the record ".concat(column.fixedOffset));
            var record = originalRecord.slice(column.fixedOffset);
            parsedType = (0, utils_1.parseType)(column.type, record, this.version);
        }
        if (this.parsedTable[columnName] === undefined)
            this.parsedTable[columnName] = [];
        this.parsedTable[columnName].push(parsedType);
    };
    AccessTable.prototype.parseDynamicLengthRecordsMetadata = function (reverseRecord, originalRecord, nullTableLength) {
        if (this.version > 3) {
            reverseRecord = reverseRecord.slice(nullTableLength + 1);
            if (reverseRecord.length > 1 && reverseRecord[0] === 0)
                reverseRecord = reverseRecord.slice(1);
            return (0, parsing_primitives_1.parseRelativeObjectMetadataStruct)(reverseRecord, undefined, this.version);
        }
        var variableLengthJumpTableCNT = Math.floor((originalRecord.length - 1) / 256);
        reverseRecord = reverseRecord.slice(nullTableLength);
        var relativeRecordMetadata;
        try {
            relativeRecordMetadata = (0, parsing_primitives_1.parseRelativeObjectMetadataStruct)(reverseRecord, variableLengthJumpTableCNT, this.version);
            relativeRecordMetadata.relativeMetadataEnd += nullTableLength;
        }
        catch (_a) {
            throw new Error('Failed parsing record');
        }
        if (relativeRecordMetadata &&
            relativeRecordMetadata.variableLengthFieldCount !==
                this.tableHeader.variableColumns) {
            var tmpBuffer = Buffer.allocUnsafe(2);
            tmpBuffer.writeUInt16LE(this.tableHeader.variableColumns);
            var metadataStart = reverseRecord.indexOf(tmpBuffer);
            if (metadataStart !== 1 && metadataStart < 10) {
                reverseRecord = reverseRecord.slice(metadataStart);
                try {
                    relativeRecordMetadata = (0, parsing_primitives_1.parseRelativeObjectMetadataStruct)(reverseRecord, variableLengthJumpTableCNT, this.version);
                }
                catch (_b) {
                    throw new Error("Failed to parse record metadata: ".concat(originalRecord));
                }
                relativeRecordMetadata.relativeMetadataEnd += metadataStart;
            }
            else {
                console.log("Record did not parse correctly. Number of columns: ".concat(this.tableHeader.variableColumns, ". Number of parsed columns: ").concat(relativeRecordMetadata.variableLengthFieldCount));
                return;
            }
        }
        return relativeRecordMetadata;
    };
    AccessTable.prototype.parseMemo = function (relativeObjData, column) {
        console.log("Parsing memo field ".concat(relativeObjData));
        var parsedMemo = parsing_primitives_1.MEMO.parse(relativeObjData);
        var memoData;
        var memoType;
        if (parsedMemo.memoLength & 0x80000000) {
            console.log('Memo data inline');
            memoData = relativeObjData.slice(parsedMemo.memoEnd);
            memoType = utils_1.DataType.Text;
        }
        else if (parsedMemo.memoLength & 0x40000000) {
            console.log('LVAL type 1');
            var tmp = this.getOverflowRecord(parsedMemo.recordPointer);
            if (tmp === undefined)
                throw new Error('LVAL type 1 memoData is undefined');
            memoData = tmp;
            memoType = utils_1.DataType.Text;
        }
        else {
            console.log('LVAL type 2');
            console.log('memo lval type 2 currently not supported');
            memoData = relativeObjData;
            memoType = column.type;
        }
        return (0, utils_1.parseType)(memoType, memoData, memoData.length, this.version);
    };
    AccessTable.prototype.parseDynamicLengthData = function (originalRecord, relativeRecordMetadata, relativeRecordsColumnMap) {
        var relativeOffsets = relativeRecordMetadata.variableLengthFieldOffsets;
        var jumpTableAddition = 0;
        var i = -1;
        for (var _i = 0, _a = Object.keys(relativeRecordsColumnMap); _i < _a.length; _i++) {
            var columnIndex = _a[_i];
            i += 1;
            var column = relativeRecordsColumnMap[columnIndex];
            var colName = column.colNameStr;
            if (this.version === 3) {
                if (relativeRecordMetadata.variableLengthJumpTable.includes(i))
                    jumpTableAddition = (jumpTableAddition + 0x100) >>> 0;
            }
            var relStart = relativeOffsets[i];
            var relEnd = void 0;
            if (i + 1 === relativeOffsets.length)
                relEnd = relativeRecordMetadata.varLenCount;
            else
                relEnd = relativeOffsets[i + 1];
            if (this.version > 3) {
                if (relEnd > originalRecord.length)
                    relEnd = (relEnd & 0xff) >>> 0;
                if (relStart > originalRecord.length)
                    relStart = (relStart & 0xff) >>> 0;
            }
            if (relStart === relEnd) {
                if (this.parsedTable[colName] === undefined)
                    this.parsedTable[colName] = [];
                this.parsedTable[colName].push('');
                continue;
            }
            var relativeObjData = originalRecord.slice(relStart + jumpTableAddition, relEnd + jumpTableAddition);
            var parsedType = void 0;
            if (column.type === utils_1.DataType.Memo) {
                try {
                    parsedType = this.parseMemo(relativeObjData, column);
                }
                catch (_b) {
                    console.log("Failed to parse memo field. Using data as bytes");
                    parsedType = relativeObjData.toString();
                }
            }
            else {
                parsedType = (0, utils_1.parseType)(column.type, relativeObjData, relativeObjData.length, this.version);
            }
            if (this.parsedTable[colName] === undefined)
                this.parsedTable[colName] = [];
            this.parsedTable[colName].push(parsedType);
        }
    };
    AccessTable.prototype.parseRow = function (record) {
        var originalRecord = Buffer.allocUnsafe(record.length);
        record.copy(originalRecord);
        var reverseRecord = Buffer.allocUnsafe(record.length);
        record.copy(reverseRecord);
        reverseRecord = reverseRecord.reverse();
        var nullTableLen = Math.floor((this.tableHeader.columnCount + 7) / 8);
        var nullTable = [];
        if (nullTableLen && nullTableLen < originalRecord.length) {
            var nullTableBuffer = record.slice(nullTableLen === 0 ? 0 : record.length - nullTableLen);
            for (var i = 0; i < nullTableBuffer.length * 8; ++i)
                nullTable.push((nullTableBuffer[Math.floor(i / 8)] &
                    (((1 << i % 8) >>> 0) >>> 0)) !==
                    0); // CHECK MOD
        }
        else {
            throw new Error("Failed to parse null table column count ".concat(this.tableHeader.columnCount));
        }
        if (this.version > 3)
            record = record.slice(2);
        else
            record = record.slice(1);
        var relativeRecordsColumnMap = {};
        for (var _i = 0, _a = Object.keys(this.columns); _i < _a.length; _i++) {
            var i = _a[_i];
            var column = this.columns[i];
            if (!column.columnFlags.fixedLength) {
                relativeRecordsColumnMap[i] = column;
                continue;
            }
            this.parseFixedLengthData(record, column, nullTable);
        }
        if (relativeRecordsColumnMap) {
            var metadata = this.parseDynamicLengthRecordsMetadata(reverseRecord, originalRecord, nullTableLen);
            if (metadata === undefined)
                return;
            this.parseDynamicLengthData(originalRecord, metadata, relativeRecordsColumnMap);
        }
    };
    AccessTable.prototype.parse = function () {
        if (!this.table.linkedPages)
            return this.createEmptyTable();
        for (var _i = 0, _a = this.table.linkedPages; _i < _a.length; _i++) {
            var dataChunk = _a[_i];
            var originalData = dataChunk;
            var parsedData = (0, parsing_primitives_1.parseDataPageHeader)(originalData, this.version);
            var lastOffset = undefined;
            for (var _b = 0, _c = parsedData.recordOffsets; _b < _c.length; _b++) {
                var recOffset = _c[_b];
                if ((recOffset & 0x8000) >>> 0) {
                    lastOffset = (recOffset & 0xfff) >>> 0;
                    continue;
                }
                if ((recOffset & 0x4000) >>> 0) {
                    var recPtrOffset = (recOffset & 0xfff) >>> 0;
                    lastOffset = recPtrOffset;
                    var overflowRecPtrBuffer = originalData.slice(recPtrOffset, recPtrOffset + 4);
                    var overflowRecPtr = overflowRecPtrBuffer.readUInt32LE(0);
                    var record_1 = this.getOverflowRecord(overflowRecPtr);
                    if (record_1 !== undefined)
                        this.parseRow(record_1);
                    continue;
                }
                var record = void 0;
                if (!lastOffset)
                    record = originalData.slice(recOffset);
                else
                    record = originalData.slice(recOffset, lastOffset);
                lastOffset = recOffset;
                if (record)
                    this.parseRow(record);
            }
        }
        return this.parsedTable;
    };
    return AccessTable;
}());
//# sourceMappingURL=index.js.map
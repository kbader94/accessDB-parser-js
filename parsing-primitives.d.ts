import { Parser } from 'binary-parser';
import { Version } from './types';
export declare const ACCESSHEADER: Parser<{
    jetString: string;
} & {
    jetVersion: number;
}>;
export declare const MEMO: Parser.Next<{
    memoLength: number;
} & {
    recordPointer: number;
} & {
    memoUnknown: number;
}, "memoEnd", number>;
export declare const TDEF_HEADER: Parser.Next<{
    peekVersion: number;
} & {
    tdefVer: number;
} & {
    nextPagePtr: number;
}, "headerEnd", number>;
export declare const parseTableHead: (buffer: Buffer, version?: Version) => {
    TDEF_header: {
        peekVersion: number;
    } & {
        tdefVer: number;
    } & {
        nextPagePtr: number;
    } & {
        headerEnd: number;
    };
} & {
    tableDefinitionLength: number;
} & {
    ver4Unknown: number;
} & {
    numberOfRows: number;
} & {
    autonumber: number;
} & {
    autonumberIncrement: number;
} & {
    complexAutonumber: number;
} & {
    ver4Unknown1: number;
} & {
    ver4Unknown2: number;
} & {
    tableTypeFlags: number;
} & {
    nextColumnID: number;
} & {
    variableColumns: number;
} & {
    columnCount: number;
} & {
    indexCount: number;
} & {
    realIndexCount: number;
} & {
    rowPageMap: number;
} & {
    freeSpacePageMap: number;
} & {
    tDefHeaderEnd: number;
};
export declare const parseTableData: (buffer: Buffer, realIndexCount: number, columnCount: number, version?: Version) => {
    readIndex: ({
        unk1: number;
    } & {
        indexRowCount: number;
    } & {
        ver4AlwaysZero: number;
    })[];
} & {
    column: ({
        type: number;
    } & {
        ver4Unknown3: number;
    } & {
        columnID: number;
    } & {
        variableColumnNumber: number;
    } & {
        columnIndex: number;
    } & {
        various: ({
            variousDec3Unknown: number;
        } & {
            maxNumberOfDigits: number;
        } & {
            numberOfDecimal: number;
        } & {
            variousDec3Unknown2: number;
        }) | ({
            maxNumOfDigits: number;
        } & {
            numOfDecimalDigits: number;
        } & {
            variousDec4Unknown: number;
        }) | ({
            LCID: number;
        } & {
            codePage: number;
        } & {
            variousText3Unknown: number;
        }) | ({
            collation: number;
        } & {
            variousText4Unknown: number;
        } & {
            collationVersionNumber: number;
        });
    } & {
        columnFlags: {
            hyperlink: number;
        } & {
            autoGUID: number;
        } & {
            unk1: number;
        } & {
            replication: number;
        } & {
            unk2: number;
        } & {
            autonumber: number;
        } & {
            canBeNull: number;
        } & {
            fixedLength: number;
        };
    } & {
        ver4Unknown4: number;
    } & {
        fixedOffset: number;
    } & {
        length: number;
    })[];
} & {
    columnNames: ({
        colNamesLen: number;
    } & {
        colNameStr: string;
    })[];
};
export declare const parseDataPageHeader: (buffer: Buffer, version?: Version) => {
    dataFreeSpace: number;
} & {
    owner: number;
} & {
    ver4UnknownData: number;
} & {
    recordCount: number;
} & {
    recordOffsets: number[];
};
export declare const parseRelativeObjectMetadataStruct: (buffer: Buffer, variableJumpTablesCNT?: number, version?: Version) => {
    variableLengthFieldCount: number;
} & {
    variableLengthJumpTable: number[];
} & {
    variableLengthFieldOffsets: number[];
} & {
    varLenCount: number;
} & {
    relativeMetadataEnd: number;
};
//# sourceMappingURL=parsing-primitives.d.ts.map
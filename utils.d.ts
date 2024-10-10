import { Version, Dico } from './types';
export declare enum DataType {
    Boolean = 1,
    Int8 = 2,
    Int16 = 3,
    Int32 = 4,
    Money = 5,
    Float32 = 6,
    Float64 = 7,
    DateTime = 8,
    Binary = 9,
    Text = 10,
    OLE = 11,
    Memo = 12,
    GUID = 15,
    Bit96Bytes17 = 16,
    Complex = 18
}
export declare const parseType: (dataType: DataType, buffer: Buffer, length?: number, version?: Version) => string | number;
export declare const categorizePages: (dbData: Buffer, pageSize: number) => [Dico<Buffer>, Dico<Buffer>, Dico<Buffer>];
//# sourceMappingURL=utils.d.ts.map
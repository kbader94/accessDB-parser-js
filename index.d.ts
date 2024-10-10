type Line = {
    data: {
        [s: string]: any;
    };
    rowNumber: number;
};
type Table = Line[];
export declare class AccessParser {
    private dbData;
    private tableDefs;
    private dataPages;
    private tablesWithData;
    private version;
    private pageSize;
    private catalog;
    constructor(dbData: Buffer);
    private parseFileHeader;
    private linkTablesToData;
    private parseCatalog;
    private parseTableUnformatted;
    parseTable(name: string): Table;
    getTables(): string[];
    getVersion(): number;
}
export {};
//# sourceMappingURL=index.d.ts.map
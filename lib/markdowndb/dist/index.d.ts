import { Knex } from "knex";
import { DatabaseFile, DatabaseQuery } from "./types";
export declare const indexFolder: (dbPath: string, folderPath?: string) => Promise<void>;
declare class MarkdownDB {
    db: Knex;
    constructor(db: Knex);
    getTags(): Promise<any[]>;
    query<T = DatabaseFile>(query?: DatabaseQuery): Promise<DatabaseFile<T>[]>;
}
export declare const Database: (dbPath: string) => MarkdownDB;
export {};

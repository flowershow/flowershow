export type DatabaseFile<T = {}> = {
    _id: string;
    _path: string;
    _url_path: string;
    filetype: string;
    metadata: any;
    type: string;
} & T;
export type MDXFile<T = {}> = DatabaseFile<{
    tags: string[];
    links: string[];
}> & T;
export interface DatabaseQuery {
    folder?: string;
    type?: string;
    tags?: string[];
    filetypes?: string[];
    urlPath?: string;
}

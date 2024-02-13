// https://specs.frictionlessdata.io/data-package/#metadata
export interface DataPackage {
    // Required properties
    resources: Resource[];

    // Recommended properties
    name?: string; // lower-case and contain only alphanumeric characters along with “.”, “_” or “-” characters
    id?: string;
    licenses?: License[];
    profile?: string;

    // Optional properties
    title?: string;
    description?: string;
    homepage?: string;
    version?: string;
    sources?: Source[];
    contributors?: Contributor[];
    keywords?: string[];
    image?: string;
    created?: string; // Should follow RFC3339 format

    // Additional properties are also allowed
    [key: string]: any;
}

export type Resource = ResourceWithPath | ResourceWithInlineData;

interface ResourceWithPath extends ResourceBase {
    path?: string | string[]; // url-or-path or array of url-or-path strings
}

interface ResourceWithInlineData extends ResourceBase {
    data: any;
}

interface ResourceBase {
    // Required properties
    name: string; // MUST be unique amongst all resources in the same data package

    // Recommended properties
    profile?: string;

    // Optional properties
    title?: string;
    description?: string;
    format?: string; // e.g., 'csv', 'xls', 'json'
    mediatype?: string; // e.g., "text/csv", "application/vnd.ms-excel"
    encoding?: string; // character encoding, default is UTF-8 if not specified
    bytes?: number; // size of the file in bytes
    hash?: string; // the hash for this resource, with algorithm prefix if not MD5
    sources?: Source[];
    licenses?: License[];
    schema?: object | string; // schema object or url-or-path to the schema JSON document

    // Additional properties are allowed, therefore an index signature is needed
    [key: string]: any;
}

type License = LicenseWithName | LicenseWithPath;

interface LicenseWithPath extends LicenseBase {
    path: string; // url-or-path
}

interface LicenseWithName extends LicenseBase {
    name: string;
}

interface LicenseBase {
    name?: string;
    path?: string; // url-or-path
    title?: string;
}

type Source = SourceWithPath | SourceWithEmail;

interface SourceWithPath extends SourceBase {
    path: string; // url-or-path
}

interface SourceWithEmail extends SourceBase {
    name: string;
}

interface SourceBase {
    title: string;
    path?: string; // url-or-path
    email?: string;
}

interface Contributor {
    title: string; // Name/title of the contributor
    email?: string;
    path?: string; // url-or-path
    role?: string; // e.g., author, publisher
    organization?: string;
}

export function isResourceWithPath(resource: Resource): resource is ResourceWithPath {
    return (resource as ResourceWithPath).path !== undefined;
}

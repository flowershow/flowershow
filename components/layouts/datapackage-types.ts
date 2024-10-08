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
  updated?: string; // Should follow RFC3339 format
  views?: SimpleView[]; // TODO support classic/original views
  [key: string]: any;
}

export type Resource = ResourceWithPath | ResourceWithInlineData;

interface ResourceWithPath extends ResourceBase {
  path: string | string[]; // url-or-path or array of url-or-path strings
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
  schema?: ResourceSchema; // TODO support string with URL to schema as per spec?

  // Additional properties are allowed, therefore an index signature is needed
  [key: string]: any;
}

// TODO check if this is the correct schema
export interface ResourceSchema {
  fields?: ResourceSchemaField[];
  // ...
}

export interface ResourceSchemaField {
  name: string;
  type: "yearmonth" | "year" | "date" | "number" | "integer" | "string";
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

export type View = SimpleView; // TODO support other view types

export type SimpleView = SimpleViewWithResources | SimpleViewWithResourceName;

type SimpleViewWithResources = SimpleViewBase & {
  resources: string[];
};

type SimpleViewWithResourceName = SimpleViewBase & {
  resourceName: string;
};

interface ViewBase {
  name: string;
  title: string;
  specType: "simple" | "plotly" | "vega" | "vega-lite";
  spec: any;
}

interface SimpleViewBase extends ViewBase {
  specType: "simple";
  spec: {
    type: SimpleGraphType;
    group: string;
    series: string[];
  };
}

type SimpleGraphType = "line" | "bar" | "lines-and-points";

export function isSimpleView(view: SimpleView | View): view is SimpleView {
  return (view as SimpleView).specType === "simple";
}

export function isSimpleViewWithResources(
  view: SimpleView,
): view is SimpleViewWithResources {
  return (view as SimpleViewWithResources).resources !== undefined;
}

export function isSimpleViewWithResourceName(
  view: SimpleView,
): view is SimpleViewWithResourceName {
  return (view as SimpleViewWithResourceName).resourceName !== undefined;
}

export function isSimpleGraphType(type: string): type is SimpleGraphType {
  return type === "line" || type === "bar";
}

export function isResourceWithPath(
  resource: Resource,
): resource is ResourceWithPath {
  return (resource as ResourceWithPath).path !== undefined;
}

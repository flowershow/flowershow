import { visit } from "unist-util-visit";
import type { MdxJsxFlowElement, MdxJsxAttribute } from "mdast-util-mdx-jsx";
import * as yaml from "yaml";
import prisma from "@/server/db";
import { Blob, Prisma } from "@prisma/client";
import type { Root, Code } from "mdast";
import type { Plugin } from "unified";
import { BinaryExpressionNode, ExprNode } from "./bases-expr";
import { parseExpression } from "./bases-parse";
import { PageMetadata } from "@/server/api/types";

interface Options {
  sitePrefix?: string;
  customDomain?: string;
  siteId?: string;
  rootDir?: string;
}

// Recursive filter type: can be a string or an object with and/or/not
type FilterValue = string | FilterObject;

type FilterKey = "and" | "or" | "not";

type FilterObject = {
  [K in FilterKey]?: FilterValue[];
};

interface BaseViewShared {
  type: string;
  name: string;
  order?: string[];
  sort?: Array<{
    property: string;
    direction: "ASC" | "DESC";
  }>;
  filters?: FilterValue;
  [key: string]: any;
}

export interface BaseCardsView extends BaseViewShared {
  cardSize?: number;
  image?: string;
  imageFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  imageAspectRatio?: number;
}

export interface BaseTableView extends BaseViewShared {
  rowHeight?: "short" | "medium" | "tall" | "extra";
  summaries?: Record<string, string>; // property -> summary function name
}

export interface BaseListView extends BaseViewShared {}

export type BaseView = BaseTableView | BaseCardsView | BaseListView;

interface BaseQuery {
  filters?: FilterValue;
  views?: Array<BaseView>;
}

function compileExpressionToPrisma(
  ast: ExprNode,
  rootDir?: string,
): Prisma.BlobWhereInput | null {
  // 1) Binary comparison on simple property
  if (
    ast.type === "BinaryExpression" &&
    ["==", "!=", ">", "<", ">=", "<="].includes(ast.operator)
  ) {
    // left must be property
    const fieldInfo = resolveProperty(ast.left);
    if (!fieldInfo) return null;

    const literal = ast.right.type === "Literal" ? ast.right.value : undefined;
    if (literal === undefined) return null;

    const prismaWhere = buildPrismaComparison(fieldInfo, ast.operator, literal);
    // If buildPrismaComparison returns null, it means this needs JS post-filter
    if (prismaWhere === null) return null;

    return prismaWhere;
  }

  // 2) file.inFolder("Something")
  if (
    ast.type === "CallExpression" &&
    isMember(ast.callee, "file", "inFolder") &&
    ast.args.length === 1 &&
    ast.args[0]!.type === "Literal" &&
    typeof ast.args[0]!.value === "string"
  ) {
    let folder = ast.args[0]!.value;

    // Strip rootDir prefix if it exists
    // This handles cases where the site has a rootDir set (e.g., "Public")
    // and files are indexed without that prefix in the database
    if (rootDir && folder.startsWith(rootDir)) {
      // Remove the rootDir prefix, handling both "Public/Something" and "Public"
      folder = folder.slice(rootDir.length);
      // Remove leading slash if present after stripping
      if (folder.startsWith("/")) {
        folder = folder.slice(1);
      }
      // If folder is now empty (was just the rootDir), match all files
      if (folder === "") {
        // Return a condition that matches all paths (no filter)
        return {};
      }
    }

    return {
      path: {
        startsWith: folder.endsWith("/") ? folder : folder + "/",
      },
    };
  }

  // 3) file.hasProperty("propertyName")
  if (
    ast.type === "CallExpression" &&
    isMember(ast.callee, "file", "hasProperty") &&
    ast.args.length === 1 &&
    ast.args[0]!.type === "Literal" &&
    typeof ast.args[0]!.value === "string"
  ) {
    const propertyName = ast.args[0]!.value;
    // Check if the property exists in metadata JSON column
    // Using path_exists which checks if a JSON path exists
    return {
      metadata: {
        path: [propertyName],
        not: Prisma.JsonNull,
      },
    };
  }

  // 4) file.ext == "md" pattern is covered by #1 + resolveProperty mapping

  // anything else → too complex for Prisma
  return null;
}

type FieldInfo =
  | { kind: "scalar"; field: keyof Prisma.BlobWhereInput } // path, extension, siteId...
  | { kind: "json"; path: string[] } // metadata, formula, etc.
  | { kind: "computed"; field: "folder" | "name" }; // computed from path

function resolveProperty(node: ExprNode): FieldInfo | null {
  // price  -> metadata.price
  if (node.type === "Identifier") {
    return { kind: "json", path: [node.name] };
  }

  if (node.type === "MemberExpression") {
    const obj = node.object;
    const prop = node.property;

    if (
      obj.type === "Identifier" &&
      (obj.name === "note" || obj.name === "formula")
    ) {
      return { kind: "json", path: [prop] };
    }

    if (obj.type === "Identifier" && obj.name === "file") {
      switch (prop) {
        case "ext":
        case "extension":
          return { kind: "scalar", field: "extension" };
        case "path":
          return { kind: "scalar", field: "path" };
        case "folder":
          // folder is computed from path, so we'll handle it in post-filter
          // but we can still support it for startsWith queries
          return { kind: "computed", field: "folder" };
        case "name":
          // name is computed from path, so we'll handle it in post-filter
          return { kind: "computed", field: "name" };
      }
    }
  }

  return null;
}

function buildPrismaComparison(
  field: FieldInfo,
  op: BinaryExpressionNode["operator"],
  value: unknown,
): Prisma.BlobWhereInput | null {
  if (field.kind === "scalar") {
    const cond: any = {};
    switch (op) {
      case "==":
        cond[field.field] = value;
        break;
      case "!=":
        cond[field.field] = { not: value };
        break;
      case ">":
        cond[field.field] = { gt: value };
        break;
      case "<":
        cond[field.field] = { lt: value };
        break;
      case ">=":
        cond[field.field] = { gte: value };
        break;
      case "<=":
        cond[field.field] = { lte: value };
        break;
    }
    return cond;
  }

  if (field.kind === "json") {
    const jsonValue = value as Prisma.InputJsonValue;
    const base: any = { path: field.path };

    switch (op) {
      case "==":
        base.equals = jsonValue;
        break;
      case "!=":
        // NOT is separate
        return {
          NOT: {
            metadata: { path: field.path, equals: jsonValue },
          },
        };
      case ">":
        base.gt = jsonValue;
        break;
      case "<":
        base.lt = jsonValue;
        break;
      case ">=":
        base.gte = jsonValue;
        break;
      case "<=":
        base.lte = jsonValue;
        break;
    }

    return { metadata: base };
  }

  if (field.kind === "computed") {
    // Computed fields like folder and name need to be handled in post-filter
    // We can't efficiently query them in Prisma since they're derived from path
    // Return null to indicate this should be handled in JS post-filter
    return null;
  }

  return {};
}

function isMember(node: ExprNode, objName: string, prop: string): boolean {
  return (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    node.object.name === objName &&
    node.property === prop
  );
}

/**
 * Recursively builds Prisma where clause from nested Obsidian Bases filters
 */
export function buildPrismaWhereClause(
  filters: FilterValue | undefined,
  rootDir?: string,
): {
  where: Prisma.BlobWhereInput;
  postFilter?: (row: any) => boolean;
} {
  if (!filters) return { where: {} };

  if (typeof filters === "string") {
    const ast = parseExpression(filters);
    const where = compileExpressionToPrisma(ast, rootDir);

    if (where) {
      return { where };
    }

    return {
      where: {},
      postFilter: compileExpressionToJsEvaluator(ast),
    };
  }

  // object: and/or/not recursively
  // object: and/or/not recursively
  const filterObj = filters as FilterObject;

  const andWheres: Prisma.BlobWhereInput[] = [];
  const orWheres: Prisma.BlobWhereInput[] = [];
  const notWheres: Prisma.BlobWhereInput[] = [];

  const andPredicates: Array<(row: any) => boolean> = [];
  const orPredicates: Array<(row: any) => boolean> = [];
  const notPredicates: Array<(row: any) => boolean> = [];

  const handleChildren = (
    children: FilterValue[] | undefined,
    targetWheres: Prisma.BlobWhereInput[],
    targetPredicates: Array<(row: any) => boolean>,
    negatePostFilter = false,
  ) => {
    if (!children) return;

    for (const child of children) {
      const { where, postFilter } = buildPrismaWhereClause(child, rootDir);

      if (Object.keys(where).length > 0) {
        targetWheres.push(where);
      }

      if (postFilter) {
        if (negatePostFilter) {
          targetPredicates.push((row) => !postFilter(row));
        } else {
          targetPredicates.push(postFilter);
        }
      }
    }
  };

  // Fill groups
  handleChildren(filterObj.and, andWheres, andPredicates);
  handleChildren(filterObj.or, orWheres, orPredicates);
  handleChildren(filterObj.not, notWheres, notPredicates, true);

  // Build Prisma where
  const where: Prisma.BlobWhereInput = {};

  if (andWheres.length > 0) {
    // Prisma accepts AND: WhereInput | WhereInput[]
    where.AND = andWheres;
  }

  if (orWheres.length > 0) {
    where.OR = orWheres;
  }

  if (notWheres.length > 0) {
    where.NOT = notWheres;
  }

  // Build JS postFilter if needed
  let postFilter: ((row: any) => boolean) | undefined;

  if (andPredicates.length || orPredicates.length || notPredicates.length) {
    postFilter = (row) => {
      // AND group: all must be true
      if (andPredicates.length && !andPredicates.every((fn) => fn(row))) {
        return false;
      }

      // OR group: if present, at least one must be true
      if (orPredicates.length && !orPredicates.some((fn) => fn(row))) {
        return false;
      }

      // NOT group: all must (already negated) be true
      if (notPredicates.length && !notPredicates.every((fn) => fn(row))) {
        return false;
      }

      return true;
    };
  }

  return { where, postFilter };
}

/**
 * Combines global filters with view-specific filters using AND logic
 */
function combineFilters(
  globalFilters?: FilterValue,
  viewFilters?: FilterValue,
): FilterValue | undefined {
  // If neither exists, return undefined
  if (!globalFilters && !viewFilters) {
    return undefined;
  }

  // If only one exists, return it
  if (!globalFilters) return viewFilters;
  if (!viewFilters) return globalFilters;

  // Both exist: combine with AND
  return {
    and: [globalFilters, viewFilters],
  };
}

/**
 * Executes the Base query against the database for a specific view
 */
async function executeBaseQueryForView(
  parsedQuery: BaseQuery,
  siteId?: string,
  view?: BaseView,
  rootDir?: string,
): Promise<any[]> {
  // Combine global filters with view-specific filters
  const combinedFilters = combineFilters(parsedQuery.filters, view?.filters);

  const { where: whereClause, postFilter } = buildPrismaWhereClause(
    combinedFilters,
    rootDir,
  );

  const finalWhere: Prisma.BlobWhereInput = siteId
    ? { AND: [whereClause, { siteId }] }
    : whereClause;

  // Build orderBy clause for file.name only (Prisma limitation with JSON fields)
  const orderBy: Prisma.BlobOrderByWithRelationInput[] = [];
  const metadataSort: Array<{ property: string; direction: "asc" | "desc" }> =
    [];

  if (view) {
    // Handle new sort format
    if (view.sort && view.sort.length > 0) {
      for (const sortItem of view.sort) {
        const direction = sortItem.direction.toLowerCase() as "asc" | "desc";

        if (sortItem.property === "file.name") {
          orderBy.push({ path: direction });
        } else {
          // Store metadata sorts for in-memory sorting
          metadataSort.push({ property: sortItem.property, direction });
        }
      }
    }
    // Fallback to legacy order format
    else if (view.order && view.order.length > 0) {
      for (const col of view.order) {
        if (col === "file.name") {
          orderBy.push({ path: "asc" });
        } else {
          // Store metadata sorts for in-memory sorting
          metadataSort.push({ property: col, direction: "asc" });
        }
      }
    }
  }

  // Execute the query
  let results = await prisma.blob.findMany({
    where: finalWhere,
    orderBy: orderBy.length > 0 ? orderBy : undefined,
    select: {
      path: true,
      metadata: true,
      appPath: true,
    },
  });

  // Apply JS filters if needed (this is where arithmetic, functions, etc. can live later)
  if (postFilter) {
    results = results.filter((row) =>
      postFilter({
        path: row.path,
        appPath: row.appPath,
        metadata: row.metadata as any,
      }),
    );
  }

  // Apply metadata sorting in memory if needed
  if (metadataSort.length > 0) {
    results = results.sort((a, b) => {
      for (const sort of metadataSort) {
        const aValue = (a.metadata as any)?.[sort.property];
        const bValue = (b.metadata as any)?.[sort.property];

        // Handle null/undefined values
        if (aValue == null && bValue == null) continue;
        if (aValue == null) return sort.direction === "asc" ? 1 : -1;
        if (bValue == null) return sort.direction === "asc" ? -1 : 1;

        // Convert to numbers if both are numeric
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        const bothNumeric = !isNaN(aNum) && !isNaN(bNum);

        let comparison = 0;
        if (bothNumeric) {
          comparison = aNum - bNum;
        } else {
          // String comparison
          comparison = String(aValue).localeCompare(String(bValue));
        }

        if (comparison !== 0) {
          return sort.direction === "asc" ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  return results;
}

/**
 * Resolve base queries by executing them against the database
 *
 * @param query - The YAML query string
 * @param siteId - Optional site ID to filter results
 * @param sitePrefix - Optional site prefix for URL generation
 * @param customDomain - Optional custom domain for URL generation
 * @param rootDir - Optional root directory that was stripped from file paths
 * @returns A promise that resolves to formatted HTML results
 */
async function resolveBaseQuery(
  query: string,
  siteId?: string,
  sitePrefix?: string,
  customDomain?: string,
  rootDir?: string,
): Promise<any> {
  try {
    // Parse the YAML query
    const parsedQuery = yaml.parse(query) as BaseQuery;

    // If no views specified, execute once with global filters only
    if (!parsedQuery.views || parsedQuery.views.length === 0) {
      const results = await executeBaseQueryForView(
        parsedQuery,
        siteId,
        undefined,
        rootDir,
      );
      return await createViewsNode(
        [results],
        [],
        sitePrefix,
        customDomain,
        siteId,
      );
    }

    // Execute the query separately for each view
    const viewResults = await Promise.all(
      parsedQuery.views.map((view) =>
        executeBaseQueryForView(parsedQuery, siteId, view, rootDir),
      ),
    );

    // Return a views node with separate data for each view
    return await createViewsNode(
      viewResults,
      parsedQuery.views,
      sitePrefix,
      customDomain,
      siteId,
    );
  } catch (error) {
    console.error("Failed to execute base query:", error);
    throw new Error(
      `Failed to execute base query: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function compileExpressionToJsEvaluator(ast: ExprNode, rootDir?: string) {
  return (row: Blob) => {
    const env = makeEnv(row, rootDir);
    try {
      const value = evalExpr(ast, env);
      return !!value;
    } catch {
      return false;
    }
  };
}

// Environment with note/file/formula/global functions later
type EvalEnv = {
  note: Record<string, any>;
  file: {
    path: string;
    ext: string;
    name: string;
    folder: string;
  };
  formula: Record<string, any>;
  globals: Record<string, (...args: any[]) => any>;
};

function makeEnv(row: Blob, rootDir?: string): EvalEnv {
  let path = row.path;

  // Add rootDir prefix back if it was stripped during indexing
  if (rootDir && !path.startsWith(rootDir)) {
    path = rootDir + (path.startsWith("/") ? "" : "/") + path;
  }

  const segments = path.split("/");
  const fileName = segments[segments.length - 1] || "";
  const ext = fileName.includes(".") ? fileName.split(".").pop()! : "";
  const folder = segments.slice(0, -1).join("/");

  return {
    note: row.metadata as PageMetadata,
    file: {
      path,
      ext,
      name: fileName,
      folder,
      // backlinks,
      // ctime,
      // embeds,
      // file,
      // links,
      // mtime,
      // properties,
      // size,
      // tags
    },
    formula: {}, // later: fill after formula pass
    globals: {
      today: () => new Date(new Date().toDateString()),
      now: () => new Date(),
      number: (x: any) => Number(x),
      escapeHTML: (html: string) => {
        if (typeof html !== "string") return String(html);
        return html
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      },
      date: (dateString: string) => {
        // Parse date string in format YYYY-MM-DD HH:mm:ss
        // Also support YYYY-MM-DD format
        const parsed = new Date(dateString);
        if (isNaN(parsed.getTime())) {
          throw new Error(`Invalid date string: ${dateString}`);
        }
        return parsed;
      },
      html: (htmlString: string) => {
        // Return a special object that marks this as raw HTML
        // This can be recognized when rendering the output
        return { __html: htmlString, __type: "html" };
      },
      min: (...values: number[]) => {
        if (values.length === 0) return undefined;
        return Math.min(...values);
      },
      max: (...values: number[]) => {
        if (values.length === 0) return undefined;
        return Math.max(...values);
      },
      list: (element: any) => {
        // If already a list/array, return it unmodified
        if (Array.isArray(element)) return element;
        // Otherwise wrap in an array
        return [element];
      },
      icon: (name: string) => {
        // Return a special object that marks this as an icon
        // The icon name should match a Lucide icon
        return { __icon: name, __type: "icon" };
      },
      image: (path: string | any) => {
        // Return a special object that marks this as an image
        // Can accept a path string, file object, or URL
        const imagePath =
          typeof path === "string" ? path : path?.path || String(path);
        return { __image: imagePath, __type: "image" };
      },
      if: (condition: any, trueResult: any, falseResult?: any) => {
        // Return trueResult if condition is truthy, otherwise falseResult (default null)
        return condition
          ? trueResult
          : falseResult !== undefined
            ? falseResult
            : null;
      },
      // etc.
    },
  };
}

/**
 * Resolves member access on objects, handling special cases for dates and other types
 */
function resolveMemberAccess(obj: any, property: string): any {
  // Handle date properties and methods
  if (obj instanceof Date) {
    switch (property) {
      case "year":
        return obj.getFullYear();
      case "month":
        return obj.getMonth() + 1; // JavaScript months are 0-indexed
      case "day":
        return obj.getDate();
      case "hour":
        return obj.getHours();
      case "minute":
        return obj.getMinutes();
      case "second":
        return obj.getSeconds();
      case "millisecond":
        return obj.getMilliseconds();
      case "date":
        return () => {
          const newDate = new Date(obj);
          newDate.setHours(0, 0, 0, 0);
          return newDate;
        };
      case "format":
        return (formatString: string) => {
          // Basic Moment.js-style format implementation
          const pad = (n: number, width: number = 2) =>
            String(n).padStart(width, "0");
          return formatString
            .replace(/YYYY/g, String(obj.getFullYear()))
            .replace(/YY/g, String(obj.getFullYear()).slice(-2))
            .replace(/MM/g, pad(obj.getMonth() + 1))
            .replace(/M/g, String(obj.getMonth() + 1))
            .replace(/DD/g, pad(obj.getDate()))
            .replace(/D/g, String(obj.getDate()))
            .replace(/HH/g, pad(obj.getHours()))
            .replace(/H/g, String(obj.getHours()))
            .replace(/mm/g, pad(obj.getMinutes()))
            .replace(/m/g, String(obj.getMinutes()))
            .replace(/ss/g, pad(obj.getSeconds()))
            .replace(/s/g, String(obj.getSeconds()))
            .replace(/SSS/g, pad(obj.getMilliseconds(), 3));
        };
      case "time":
        return () => {
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${pad(obj.getHours())}:${pad(obj.getMinutes())}:${pad(obj.getSeconds())}`;
        };
      case "relative":
        return () => {
          const now = new Date();
          const diffMs = now.getTime() - obj.getTime();
          const diffSec = Math.floor(Math.abs(diffMs) / 1000);
          const diffMin = Math.floor(diffSec / 60);
          const diffHour = Math.floor(diffMin / 60);
          const diffDay = Math.floor(diffHour / 24);
          const diffWeek = Math.floor(diffDay / 7);
          const diffMonth = Math.floor(diffDay / 30);
          const diffYear = Math.floor(diffDay / 365);

          const isPast = diffMs > 0;
          const suffix = isPast ? " ago" : " from now";

          if (diffYear > 0)
            return `${diffYear} year${diffYear > 1 ? "s" : ""}${suffix}`;
          if (diffMonth > 0)
            return `${diffMonth} month${diffMonth > 1 ? "s" : ""}${suffix}`;
          if (diffWeek > 0)
            return `${diffWeek} week${diffWeek > 1 ? "s" : ""}${suffix}`;
          if (diffDay > 0)
            return `${diffDay} day${diffDay > 1 ? "s" : ""}${suffix}`;
          if (diffHour > 0)
            return `${diffHour} hour${diffHour > 1 ? "s" : ""}${suffix}`;
          if (diffMin > 0)
            return `${diffMin} minute${diffMin > 1 ? "s" : ""}${suffix}`;
          return "just now";
        };
      case "isEmpty":
        return () => false; // Dates are never empty
    }
  }

  // Handle string properties and methods
  if (typeof obj === "string") {
    switch (property) {
      case "length":
        return obj.length;
      case "contains":
        return (value: string) => obj.includes(value);
      case "containsAll":
        return (...values: string[]) => values.every((v) => obj.includes(v));
      case "containsAny":
        return (...values: string[]) => values.some((v) => obj.includes(v));
      case "endsWith":
        return (query: string) => obj.endsWith(query);
      case "isEmpty":
        return () => obj.length === 0;
      case "lower":
        return () => obj.toLowerCase();
      case "replace":
        return (pattern: string | RegExp, replacement: string) => {
          if (typeof pattern === "string") {
            // Replace all occurrences for string patterns
            return obj.split(pattern).join(replacement);
          }
          // For RegExp, use native replace
          return obj.replace(pattern, replacement);
        };
      case "repeat":
        return (count: number) => obj.repeat(count);
      case "reverse":
        return () => obj.split("").reverse().join("");
      case "slice":
        return (start: number, end?: number) => obj.slice(start, end);
      case "split":
        return (separator: string | RegExp, n?: number) => {
          const parts = obj.split(separator);
          return n !== undefined ? parts.slice(0, n) : parts;
        };
      case "startsWith":
        return (query: string) => obj.startsWith(query);
      case "title":
        return () =>
          obj
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" ");
      case "trim":
        return () => obj.trim();
    }
  }

  // Handle number methods
  if (typeof obj === "number") {
    switch (property) {
      case "abs":
        return () => Math.abs(obj);
      case "ceil":
        return () => Math.ceil(obj);
      case "floor":
        return () => Math.floor(obj);
      case "isEmpty":
        return () => false; // Numbers are never empty (even 0 is not empty)
      case "round":
        return (digits?: number) => {
          if (digits === undefined) {
            return Math.round(obj);
          }
          const multiplier = Math.pow(10, digits);
          return Math.round(obj * multiplier) / multiplier;
        };
      case "toFixed":
        return (precision: number) => obj.toFixed(precision);
    }
  }

  // Handle array/list properties and methods
  if (Array.isArray(obj)) {
    switch (property) {
      case "length":
        return obj.length;
      case "contains":
        return (value: any) => obj.includes(value);
      case "containsAll":
        return (...values: any[]) => values.every((v) => obj.includes(v));
      case "containsAny":
        return (...values: any[]) => values.some((v) => obj.includes(v));
      case "filter":
        return (expression: any) => {
          // The expression should be evaluated with 'value' and 'index' variables
          // For now, we'll support simple boolean expressions
          // This is a simplified implementation - full support would require
          // parsing and evaluating the expression with proper context
          if (typeof expression === "function") {
            return obj.filter(expression);
          }
          // If expression is already evaluated to boolean, filter by it
          return obj.filter(() => expression);
        };
      case "flat":
        return () => obj.flat();
      case "isEmpty":
        return () => obj.length === 0;
      case "join":
        return (separator: string) => obj.join(separator);
      case "map":
        return (expression: any) => {
          // Similar to filter, this would need proper expression evaluation
          // For now, support function callbacks
          if (typeof expression === "function") {
            return obj.map(expression);
          }
          // If expression is a value, return array of that value
          return obj.map(() => expression);
        };
      case "reduce":
        return (expression: any, initialValue: any) => {
          // This would need proper expression evaluation with acc, value, index
          // For now, support function callbacks
          if (typeof expression === "function") {
            return obj.reduce(expression, initialValue);
          }
          return initialValue;
        };
      case "reverse":
        return () => [...obj].reverse(); // Create copy to avoid mutating original
      case "slice":
        return (start: number, end?: number) => obj.slice(start, end);
      case "sort":
        return () =>
          [...obj].sort((a, b) => {
            // Sort numbers numerically, strings alphabetically
            if (typeof a === "number" && typeof b === "number") {
              return a - b;
            }
            return String(a).localeCompare(String(b));
          });
      case "unique":
        return () => [...new Set(obj)];
    }
  }

  // Handle RegExp methods
  if (obj instanceof RegExp) {
    switch (property) {
      case "matches":
        return (value: string) => obj.test(value);
    }
  }

  // Handle object methods (for plain objects)
  if (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    !(obj instanceof Date) &&
    !(obj instanceof RegExp)
  ) {
    switch (property) {
      case "isEmpty":
        return () => Object.keys(obj).length === 0;
      case "keys":
        return () => Object.keys(obj);
      case "values":
        return () => Object.values(obj);
    }
  }

  // Handle generic methods
  if (property === "isTruthy") {
    return () => !!obj;
  }
  if (property === "toString") {
    return () => obj.toString();
  }

  // Default property access
  return obj?.[property];
}

function evalExpr(node: ExprNode, env: EvalEnv): any {
  switch (node.type) {
    case "Literal":
      return node.value;

    case "Identifier":
      // bare identifier → note property if present, else global function
      if (node.name === "file") return env.file;
      if (node.name in env.globals) return env.globals[node.name];
      return env.note[node.name];

    case "MemberExpression": {
      const obj = evalExpr(node.object, env);
      return resolveMemberAccess(obj, node.property);
    }

    case "UnaryExpression": {
      const v = evalExpr(node.argument, env);
      if (node.operator === "!") return !v;
      if (node.operator === "-") return -Number(v);
      throw new Error("Unsupported unary operator");
    }

    case "BinaryExpression": {
      const l = evalExpr(node.left, env);
      const r = evalExpr(node.right, env);

      switch (node.operator) {
        case "==":
          return l == r;
        case "!=":
          return l != r;
        case ">":
          return l > r;
        case "<":
          return l < r;
        case ">=":
          return l >= r;
        case "<=":
          return l <= r;
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "%":
          return l % r;
      }
    }

    case "LogicalExpression": {
      if (node.operator === "&&") {
        const left = evalExpr(node.left, env);
        return left && evalExpr(node.right, env);
      }
      if (node.operator === "||") {
        const left = evalExpr(node.left, env);
        return left || evalExpr(node.right, env);
      }
      throw new Error("Unsupported logical operator");
    }

    case "CallExpression": {
      const callee = evalExpr(node.callee, env);
      const args = node.args.map((a) => evalExpr(a, env));
      if (typeof callee === "function") {
        return callee(...args);
      }
      // method call like file.inFolder(...) we want to support:
      // if callee is a property, we may need to interpret MemberExpression specially
      throw new Error("Callee is not a function");
    }
  }
}

/**
 * Remark plugin to transform code blocks with language "base"
 * to support Obsidian Bases queries.
 *
 * This plugin:
 * - Finds code nodes with lang="base"
 * - Extracts the YAML query from the code content
 * - Executes the query against the database
 * - Replaces the code block with an HTML node containing the query result
 */
const remarkObsidianBases: Plugin<[Options?], Root> = (options = {}) => {
  const { siteId, sitePrefix, customDomain, rootDir } = options;

  return async (tree) => {
    const nodesToTransform: Array<{
      node: Code;
      index: number;
      parent: any;
    }> = [];

    // First pass: collect all code nodes with lang="base"
    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang === "base" && parent && typeof index === "number") {
        nodesToTransform.push({
          node,
          index,
          parent,
        });
      }
    });

    // Second pass: transform all collected nodes
    for (const { node, index, parent } of nodesToTransform) {
      try {
        // Extract the YAML query from the code block
        const queryContent = node.value;

        // Execute the query
        const resultNode = await resolveBaseQuery(
          queryContent,
          siteId,
          sitePrefix,
          customDomain,
          rootDir,
        );

        parent.children[index] = resultNode;
      } catch (error) {
        console.error("Error processing base query:", error);

        // On error, replace with an error message
        const errorNode = {
          type: "html",
          value: `<div class="obsidian-base-error">Error processing base query: ${error instanceof Error ? error.message : "Unknown error"}</div>`,
        };

        parent.children[index] = errorNode;
      }
    }
  };
};

/**
 * Calculate summary for a column based on the summary function name
 */
function calculateSummary(
  rows: any[],
  column: string,
  summaryFunction: string,
): number | string | null {
  // Extract values for the column
  const values = rows
    .map((row) => {
      if (column === "file.name") {
        return null; // file.name doesn't make sense for summaries
      }
      return row.metadata?.[column];
    })
    .filter((v) => v !== null && v !== undefined);

  if (values.length === 0) return null;

  // Convert to numbers for numeric summaries
  const numericValues = values.map((v) => Number(v)).filter((n) => !isNaN(n));

  switch (summaryFunction.toLowerCase()) {
    // Numeric summaries
    case "average":
      if (numericValues.length === 0) return null;
      return numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

    case "min":
      if (numericValues.length === 0) return null;
      return Math.min(...numericValues);

    case "max":
      if (numericValues.length === 0) return null;
      return Math.max(...numericValues);

    case "sum":
      if (numericValues.length === 0) return null;
      return numericValues.reduce((a, b) => a + b, 0);

    case "range":
      if (numericValues.length === 0) return null;
      return Math.max(...numericValues) - Math.min(...numericValues);

    case "median":
      if (numericValues.length === 0) return null;
      const sorted = [...numericValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1]! + sorted[mid]!) / 2
        : sorted[mid]!;

    case "stddev":
      if (numericValues.length === 0) return null;
      const mean =
        numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const variance =
        numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        numericValues.length;
      return Math.sqrt(variance);

    // Date summaries
    case "earliest":
      const dates = values
        .map((v) => new Date(v))
        .filter((d) => !isNaN(d.getTime()));
      if (dates.length === 0) return null;
      return new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString();

    case "latest":
      const latestDates = values
        .map((v) => new Date(v))
        .filter((d) => !isNaN(d.getTime()));
      if (latestDates.length === 0) return null;
      return new Date(
        Math.max(...latestDates.map((d) => d.getTime())),
      ).toISOString();

    // Boolean summaries
    case "checked":
      return values.filter((v) => v === true || v === "true").length;

    case "unchecked":
      return values.filter((v) => v === false || v === "false").length;

    // Generic summaries
    case "empty":
      return rows.length - values.length;

    case "filled":
      return values.length;

    case "unique":
      return new Set(values).size;

    default:
      return null;
  }
}

async function createViewsNode(
  viewResults: any[][],
  views: Array<{
    type: string;
    name: string;
    order?: string[];
    [key: string]: any;
  }>,
  sitePrefix?: string,
  customDomain?: string,
  siteId?: string,
): Promise<MdxJsxFlowElement> {
  // If no views specified, default to table view
  if (views.length === 0) {
    views = [{ type: "table", name: "Table", order: ["file.name"] }];
  }

  // Transform each view's results into the expected format
  const viewData = viewResults.map((results, index) => {
    const view = views[index];
    const columns = view?.order ?? ["file.name"];

    const rows = results.map((result) => ({
      path: result.path,
      appPath: result.appPath,
      metadata: result.metadata as Record<string, any>,
    }));

    // Calculate summaries if specified
    let summaries:
      | Record<string, { value: number | string | null; function: string }>
      | undefined;
    if (view?.summaries && Object.keys(view.summaries).length > 0) {
      summaries = {};
      for (const [column, summaryFunction] of Object.entries(view.summaries)) {
        summaries[column] = {
          value: calculateSummary(rows, column, summaryFunction as string),
          function: summaryFunction as string,
        };
      }
    }

    return {
      view,
      columns,
      rows,
      summaries,
    };
  });

  // Fetch all blob paths for the site
  let allSitePaths: string[] = [];
  if (siteId) {
    const blobs = await prisma.blob.findMany({
      where: { siteId },
      select: { path: true },
    });
    allSitePaths = blobs.map((blob) => blob.path);
  }

  // Pass JSON strings as props and parse inside the component
  const attrs: MdxJsxAttribute[] = [
    {
      type: "mdxJsxAttribute",
      name: "viewData",
      value: JSON.stringify(viewData),
    },
    {
      type: "mdxJsxAttribute",
      name: "sitePrefix",
      value: sitePrefix || "",
    },
    {
      type: "mdxJsxAttribute",
      name: "customDomain",
      value: customDomain || "",
    },
    {
      type: "mdxJsxAttribute",
      name: "allSitePaths",
      value: JSON.stringify(allSitePaths),
    },
  ];

  return {
    type: "mdxJsxFlowElement",
    name: "ObsidianBasesViews",
    attributes: attrs,
    children: [],
  };
}

export default remarkObsidianBases;

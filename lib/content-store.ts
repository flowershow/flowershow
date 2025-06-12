import {
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { GitHubAPIRepoTree } from "./github";
import { env } from "@/env.mjs";

const {
  S3_ENDPOINT,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_REGION,
  S3_FORCE_PATH_STYLE,
} = env;

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: S3_FORCE_PATH_STYLE,
});

type ContentType =
  | "text/markdown"
  | "text/csv"
  | "text/plain"
  | "application/geo+json"
  | "application/json"
  | "application/yaml"
  | "text/css"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/svg+xml"
  | "video/mp4"
  | "image/x-icon";

const uploadS3Object = async ({
  key,
  file,
  contentType,
}: {
  key: string;
  file: Buffer;
  contentType: ContentType;
}) => {
  return s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "no-cache",
    }),
  );
};

const deleteS3Object = async (key: string) => {
  return s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    }),
  );
};

const fetchS3Object = async (key: string) => {
  return await s3Client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    }),
  );
};

const emptyS3Directory = async (dir: string) => {
  const listedObjects = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: dir,
    }),
  );

  // Return early if no contents or empty contents
  if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

  const objectsToDelete = listedObjects.Contents.map(({ Key }) => ({
    Key: Key || "", // Ensure Key is never undefined
  })).filter(({ Key }) => Key !== ""); // Filter out any empty keys

  // Only send delete command if we have objects to delete
  if (objectsToDelete.length > 0) {
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET_NAME,
        Delete: {
          Objects: objectsToDelete,
          Quiet: false,
        },
      }),
    );
  }

  if (listedObjects.IsTruncated) await emptyS3Directory(dir);
};

const getContentType = (extension: string): ContentType => {
  switch (extension) {
    case "md":
    case "mdx":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "geojson":
      return "application/geo+json";
    case "json":
      return "application/json";
    case "yaml":
    case "yml":
      return "application/yaml";
    case "css":
      return "text/css";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "mp4":
      return "video/mp4";
    case "ico":
      return "image/x-icon";
    default:
      return "application/json"; // Fallback to JSON for any new extensions
  }
};

export const uploadFile = async ({
  projectId,
  branch,
  path,
  content,
  extension,
}: {
  projectId: string;
  branch: string;
  path: string;
  content: Buffer;
  extension: string;
}) => {
  return uploadS3Object({
    key: `${projectId}/${branch}/raw/${path}`,
    file: content,
    contentType: getContentType(extension),
  });
};

export const fetchFile = async ({
  projectId,
  branch,
  path,
}: {
  projectId: string;
  branch: string;
  path: string;
}) => {
  const response = await fetchS3Object(`${projectId}/${branch}/raw/${path}`);
  return (await response.Body?.transformToString()) || null;
};

export const deleteFile = async ({
  projectId,
  branch,
  path,
}: {
  projectId: string;
  branch: string;
  path: string;
}) => {
  return deleteS3Object(`${projectId}/${branch}/raw/${path}`);
};

export const deleteProject = async (projectId: string) => {
  await emptyS3Directory(`${projectId}/`);
};

export const uploadTree = async ({
  projectId,
  branch,
  tree,
}: {
  projectId: string;
  branch: string;
  tree: GitHubAPIRepoTree;
}) => {
  return uploadS3Object({
    key: `${projectId}/${branch}/_tree`,
    file: Buffer.from(JSON.stringify(tree)),
    contentType: "application/json",
  });
};

export const fetchTree = async (projectId: string, branch: string) => {
  const response = await fetchS3Object(`${projectId}/${branch}/_tree`);
  const tree = await response.Body?.transformToString();
  return tree ? (JSON.parse(tree) as GitHubAPIRepoTree) : null;
};

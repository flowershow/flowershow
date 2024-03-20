import {
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { SupportedExtension } from "./types";
import { GitHubAPIRepoTree } from "./github";
import { env } from "@/env.mjs";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_KEY_ID, R2_BUCKET_NAME } =
  env;

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_KEY_ID,
  },
});

type ContentType =
  | "text/markdown"
  | "text/csv"
  | "application/json"
  | "application/yaml"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/svg+xml";

const uploadR2Object = async ({
  key,
  file,
  contentType,
}: {
  key: string;
  file: Buffer;
  contentType: ContentType;
}) => {
  return R2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    }),
  );
};

const fetchR2Object = async (key: string) => {
  const response = await R2.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
  // TODO transform to string here or in the caller?
  return await response.Body?.transformToString();
};

const emptyR2Directory = async (dir: string) => {
  const listedObjects = await R2.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: dir,
    }),
  );

  if (listedObjects.Contents?.length === 0) return;

  const objectsToDelete = listedObjects.Contents?.map(({ Key }) => ({ Key }));

  await R2.send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    }),
  );

  if (listedObjects.IsTruncated) await emptyR2Directory(dir);
};

const getContentType = (extension: SupportedExtension): ContentType => {
  switch (extension) {
    case "md":
    case "mdx":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "yaml":
    case "yml":
      return "application/yaml";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
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
  extension: SupportedExtension;
}) => {
  return uploadR2Object({
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
  try {
    return (await fetchR2Object(`${projectId}/${branch}/raw/${path}`)) || null;
  } catch (error) {
    throw new Error(
      `Could not fetch content from any configured path: ${error}`,
    );
  }
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
  await R2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `${projectId}/${branch}/raw/${path}`,
    }),
  );
};

export const deleteProject = async (projectId: string) => {
  await emptyR2Directory(`${projectId}/`);
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
  return uploadR2Object({
    key: `${projectId}/${branch}/_tree`,
    file: Buffer.from(JSON.stringify(tree)),
    contentType: "application/json",
  });
};

export const fetchTree = async (projectId: string, branch: string) => {
  try {
    const tree = await fetchR2Object(`${projectId}/${branch}/_tree`);
    if (!tree) return null;
    return JSON.parse(tree) as GitHubAPIRepoTree;
  } catch (e) {
    console.log(e);
    return null;
  }
};

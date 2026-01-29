import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env.mjs';
import { GitHubAPIRepoTree } from './github';

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
  | 'text/markdown'
  | 'text/csv'
  | 'text/plain'
  | 'text/html'
  | 'application/geo+json'
  | 'application/json'
  | 'application/yaml'
  | 'text/css'
  | 'text/javascript'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/svg+xml'
  | 'video/mp4'
  | 'video/webm'
  | 'audio/aac'
  | 'audio/mpeg' // mp3
  | 'audio/opus'
  | 'image/x-icon'
  | 'image/webp'
  | 'image/avif'
  | 'application/pdf';

const uploadS3Object = async ({
  key,
  file,
  contentType,
}: {
  key: string;
  file: Buffer;
  contentType: ContentType;
}) => {
  const maxAge =
    contentType === 'text/html' || contentType === 'text/markdown' ? 0 : 300;
  return s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: `max-age=${maxAge}, must-revalidate`,
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
    Key: Key || '', // Ensure Key is never undefined
  })).filter(({ Key }) => Key !== ''); // Filter out any empty keys

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

export const getContentType = (extension: string): ContentType => {
  switch (extension) {
    case 'md':
    case 'mdx':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'csv':
      return 'text/csv';
    case 'geojson':
      return 'application/geo+json';
    case 'json':
      return 'application/json';
    case 'yaml':
    case 'yml':
    case 'base': // Obsidian Base files
      return 'application/yaml';
    case 'css':
      return 'text/css';
    case 'js':
      return 'text/javascript';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'pdf':
      return 'application/pdf';

    // Video
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';

    // Audio
    case 'aac':
      return 'audio/aac';
    case 'mp3':
      return 'audio/mpeg';
    case 'opus':
      return 'audio/opus';

    default:
      return 'application/json'; // Fallback to JSON for any new extensions
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
    contentType: 'application/json',
  });
};

export const fetchTree = async (projectId: string, branch: string) => {
  const response = await fetchS3Object(`${projectId}/${branch}/_tree`);
  const tree = await response.Body?.transformToString();
  return tree ? (JSON.parse(tree) as GitHubAPIRepoTree) : null;
};

/**
 * Generate a presigned URL for uploading a file directly to R2
 * @param key - The S3 key for the file
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param contentType - Optional content type for the file
 * @returns Presigned URL for PUT request
 */
export const generatePresignedUploadUrl = async (
  key: string,
  expiresIn: number = 3600,
  contentType?: ContentType,
): Promise<string> => {
  const maxAge =
    contentType === 'text/html' || contentType === 'text/markdown' ? 0 : 300;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ...(contentType && {
      ContentType: contentType,
      CacheControl: `max-age=${maxAge}, must-revalidate`,
    }),
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Get the S3 client instance (for advanced usage)
 */
export const getS3Client = () => s3Client;

/**
 * Get the bucket name
 */
export const getBucketName = () => S3_BUCKET_NAME;

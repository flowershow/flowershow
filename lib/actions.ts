"use server";

import prisma from "@/server/db";
import { getSession } from "@/server/auth";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";

// export const getSiteFromPostId = async (postId: string) => {
//   const post = await prisma.post.findUnique({
//     where: {
//       id: postId,
//     },
//     select: {
//       siteId: true,
//     },
//   });
//   return post?.siteId;
// };

// export const createPost = withSiteAuth(async (_: FormData, site: Site) => {
//   const session = await getSession();
//   if (!session?.user.id) {
//     return {
//       error: "Not authenticated",
//     };
//   }
//   const response = await prisma.post.create({
//     data: {
//       siteId: site.id,
//       userId: session.user.id,
//     },
//   });

//   await revalidateTag(
//     `${site.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`,
//   );
//   site.customDomain && (await revalidateTag(`${site.customDomain}-posts`));

//   return response;
// });

// creating a separate function for this because we're not using FormData
// export const updatePost = async (data: Post) => {
//   const session = await getSession();
//   if (!session?.user.id) {
//     return {
//       error: "Not authenticated",
//     };
//   }
//   const post = await prisma.post.findUnique({
//     where: {
//       id: data.id,
//     },
//     include: {
//       site: true,
//     },
//   });
//   if (!post || post.userId !== session.user.id) {
//     return {
//       error: "Post not found",
//     };
//   }
//   try {
//     const response = await prisma.post.update({
//       where: {
//         id: data.id,
//       },
//       data: {
//         title: data.title,
//         description: data.description,
//         content: data.content,
//       },
//     });

//     await revalidateTag(
//       `${post.site?.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`,
//     );
//     await revalidateTag(
//       `${post.site?.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-${post.slug}`,
//     );

//     // if the site has a custom domain, we need to revalidate those tags too
//     post.site?.customDomain &&
//       (await revalidateTag(`${post.site?.customDomain}-posts`),
//         await revalidateTag(`${post.site?.customDomain}-${post.slug}`));

//     return response;
//   } catch (error: any) {
//     return {
//       error: error.message,
//     };
//   }
// };

// export const updatePostMetadata = withPostAuth(
//   async (
//     formData: FormData,
//     post: Post & {
//       site: Site;
//     },
//     key: string,
//   ) => {
//     const value = formData.get(key) as string;

//     try {
//       let response;
//       if (key === "image") {
//         const file = formData.get("image") as File;
//         const filename = `${nanoid()}.${file.type.split("/")[1]}`;

//         const { url } = await put(filename, file, {
//           access: "public",
//         });

//         const blurhash = await getBlurDataURL(url);

//         response = await prisma.post.update({
//           where: {
//             id: post.id,
//           },
//           data: {
//             image: url,
//             imageBlurhash: blurhash,
//           },
//         });
//       } else {
//         response = await prisma.post.update({
//           where: {
//             id: post.id,
//           },
//           data: {
//             [key]: key === "published" ? value === "true" : value,
//           },
//         });
//       }

//       await revalidateTag(
//         `${post.site?.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`,
//       );
//       await revalidateTag(
//         `${post.site?.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}-${post.slug}`,
//       );

//       // if the site has a custom domain, we need to revalidate those tags too
//       post.site?.customDomain &&
//         (await revalidateTag(`${post.site?.customDomain}-posts`),
//           await revalidateTag(`${post.site?.customDomain}-${post.slug}`));

//       return response;
//     } catch (error: any) {
//       if (error.code === "P2002") {
//         return {
//           error: `This slug is already in use`,
//         };
//       } else {
//         return {
//           error: error.message,
//         };
//       }
//     }
//   },
// );

export const editUser = async (
  formData: FormData,
  _id: unknown,
  key: string,
) => {
  const session = await getSession();
  if (!session?.user.id) {
    return {
      error: "Not authenticated",
    };
  }
  const value = formData.get(key) as string;

  try {
    const response = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        [key]: value,
      },
    });
    return response;
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        error: `This ${key} is already in use`,
      };
    } else {
      return {
        error: error.message,
      };
    }
  }
};

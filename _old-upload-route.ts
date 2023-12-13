// import { put } from "@vercel/blob";
// import { nanoid } from "nanoid";
// import { NextResponse } from "next/server";
// import { env } from "@/env.mjs"

// export const runtime = "edge";

// export async function POST(req: Request) {
//   if (!env.BLOB_READ_WRITE_TOKEN) {
//     return new Response(
//       "Missing BLOB_READ_WRITE_TOKEN. Don't forget to add that to your .env file.",
//       {
//         status: 401,
//       },
//     );
//   }

//   const file = req.body || "";
//   const contentType = req.headers.get("content-type") || "text/plain";
//   const filename = `${nanoid()}.${contentType.split("/")[1]}`;
//   const blob = await put(filename, file, {
//     contentType,
//     access: "public",
//   });

//   return NextResponse.json(blob);
// }

// export function processMdxString(str: string) {
//   // Regex to match JSX tags and HTML tags
//   const tagRegex = /(<\/?\w+[^>]*>)/g;

//   // Split the string into an array based on the tags
//   return str
//     .split(tagRegex)
//     .map((part) => {
//       // If the part matches a tag, don't escape it
//       if (tagRegex.test(part)) {
//         return part;
//       }
//       // Otherwise, escape < and >
//       return part.replace(/</g, "&lt;").replace(/>/g, "&gt;");
//     })
//     .join("");
// }

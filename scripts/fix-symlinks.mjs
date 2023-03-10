// Script executed before builds

import fs from "fs";

//  If Vercel environment is detected
if (process.env.VERCEL_ENV) {
  console.log(
    "[scripts/fix-symlinks.mjs] Vercel environment detected. Fixing symlinks..."
  );

  const pathToAssetsLn = "./public/assets";
  const pathToExcalidrawLn = "./public/Excalidraw";

  fs.unlinkSync(pathToAssetsLn);
  fs.unlinkSync(pathToExcalidrawLn);

  fs.symlinkSync("../../public/assets", pathToAssetsLn);
  fs.symlinkSync("../../public/Exaclidraw", pathToExcalidrawLn);
}

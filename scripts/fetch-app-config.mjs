import fs from "fs";
import axios from "axios";
import "dotenv/config";

(async () => {
  if (
    process.env.CI ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    try {
      if (!process.env.APP_CONFIG_URL) {
        console.error(
          "APP_CONFIG_URL is not defined in environment variables.",
        );
        process.exit(1);
      }
      const res = await axios.get(process.env.APP_CONFIG_URL);
      const productConfig = res.data;
      fs.writeFileSync("./config.json", JSON.stringify(productConfig, null, 2));
      console.log("Product configuration fetched successfully.");
    } catch (error) {
      console.error("Error fetching product configuration:", error);
      process.exit(1);
    }
  }
})();

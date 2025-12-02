import fs from "fs";
import axios from "axios";
import "dotenv/config";

(async () => {
  try {
    if (!process.env.APP_CONFIG_URL) {
      console.error("APP_CONFIG_URL is not defined in environment variables.");
      process.exit(1);
    }
    // if (fs.existsSync("./config.json")) {
    //   console.log("Product configuration already exists.");
    //   process.exit(0);
    // }
    const res = await axios.get(process.env.APP_CONFIG_URL);
    const productConfig = res.data;
    fs.writeFileSync("./config.json", JSON.stringify(productConfig, null, 2));
    console.log("Product configuration fetched successfully.");
  } catch (error) {
    console.error("Error fetching product configuration:", error);
    process.exit(1);
  }
})();

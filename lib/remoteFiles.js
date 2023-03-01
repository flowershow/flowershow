import axios from "axios";

export function validateUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export async function getContentFromUrl(url) {
  //  We can improve the error handling later
  //  For now, it's going to display the 500 error
  //  page on prod and the error overlay on dev
  if (!validateUrl(url)) {
    throw new Error("Invalid URL");
  }

  return axios
    .get(url)
    .then((r) => r.data)
    .catch((e) => {
      throw new Error("URL could not be found");
    });
}

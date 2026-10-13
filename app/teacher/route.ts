import { chatGPTSignInPath, chatGPTSignOutPath } from "../chatgpt-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = url.searchParams.has("signout") ? chatGPTSignOutPath("/") : chatGPTSignInPath("/?teacher=1");
  return Response.redirect(new URL(destination, url), 302);
}

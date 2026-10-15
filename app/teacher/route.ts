export async function GET(request: Request) {
  const url = new URL(request.url);
  return Response.redirect(new URL('/?teacher=1', url), 302);
}

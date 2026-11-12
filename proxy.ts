import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./backend/modules/auth/constants";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/" &&
    !request.cookies.get(SESSION_COOKIE_NAME)
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};

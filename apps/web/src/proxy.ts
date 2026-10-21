import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API/Sanctum proxying, Next internals and any file with an extension.
  matcher: "/((?!api|sanctum|_next|_vercel|.*\\..*).*)",
};

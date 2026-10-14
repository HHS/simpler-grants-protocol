import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// Keep Starlight's mobile menu on the splash landing page; custom.css hides
// the desktop sidebar this also brings.
export const onRequest = defineRouteMiddleware(({ locals }) => {
  if (locals.starlightRoute.entry.data.template === "splash") {
    locals.starlightRoute.hasSidebar = true;
  }
});

import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("requires login to open the panel", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.routesById["/_authenticated"].options.beforeLoad).toBeDefined();
  });

  it("shows the login screen instead of redirecting", async () => {
    const { Route } = await import("@/routes/auth");
    expect(Route.options.beforeLoad).toBeUndefined();
    expect(Route.options.component).toBeDefined();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { createContext, useContext, useEffect } from "react";
import { PageTransition } from "./page-transition";

let pathname = "/tracker";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const RouteContext = createContext("/tracker");

describe("PageTransition", () => {
  it("mounts the incoming page exactly once on navigation", async () => {
    const mounts: string[] = [];
    function Probe({ name }: { name: string }) {
      useEffect(() => {
        mounts.push(name);
      }, [name]);
      return <div>{name}</div>;
    }
    // Mimics the App Router outlet: it reads the live router state from
    // context, so a retained exiting copy renders the incoming page too.
    function Outlet() {
      const route = useContext(RouteContext);
      return <Probe key={route} name={route} />;
    }
    const tree = (route: string) => (
      <RouteContext.Provider value={route}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </RouteContext.Provider>
    );
    const { rerender } = render(tree("/tracker"));
    mounts.length = 0;
    pathname = "/dashboard";
    act(() => {
      rerender(tree("/dashboard"));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 800));
    });
    expect(mounts.filter((m) => m === "/dashboard")).toHaveLength(1);
  });
});

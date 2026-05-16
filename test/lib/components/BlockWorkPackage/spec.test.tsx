// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { openProjectWorkPackageBlockSpec } from "../../../../lib/components/BlockWorkPackage/spec";
import { initOpenProjectApi } from "../../../../lib/services/openProjectApi";

type BlockArg = {
  id: string;
  type: string;
  props: { wpid?: number; size?: string; initialized?: boolean };
  content: undefined;
  children: never[];
};

function renderExternalHTML(props: BlockArg["props"]): HTMLElement {
  const spec = openProjectWorkPackageBlockSpec();
  const result = spec.implementation.toExternalHTML!.call(
    {},
    {
      id: "b1",
      type: "openProjectWorkPackageBlock",
      props,
      content: undefined,
      children: [],
    } as never,
    { headless: true } as never,
    { nestingLevel: 0 },
  );
  return (result as { dom: HTMLElement }).dom;
}

describe("openProjectWorkPackageBlockSpec toExternalHTML", () => {
  it("emits an anchor linking to the work package so blocksToMarkdownLossy produces a real link", () => {
    initOpenProjectApi({ baseUrl: "https://example.com" });

    const dom = renderExternalHTML({ wpid: 123, size: "m", initialized: true });
    const anchor = dom.querySelector("a");

    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("https://example.com/wp/123");
    expect(anchor!.getAttribute("data-block-content-type")).toBe("openProjectWorkPackageBlock");
    expect(anchor!.getAttribute("data-wpid")).toBe("123");
    expect(anchor!.getAttribute("data-size")).toBe("m");
    expect(anchor!.textContent).toBe("###123");
  });

  it("uses three hashes for any block size (m / l / xl)", () => {
    initOpenProjectApi({ baseUrl: "https://example.com" });

    for (const size of ["m", "l", "xl"]) {
      const dom = renderExternalHTML({ wpid: 7, size, initialized: true });
      expect(dom.querySelector("a")!.textContent).toBe("###7");
    }
  });

  it("respects the configured baseUrl", () => {
    initOpenProjectApi({ baseUrl: "https://op.internal/" });

    const dom = renderExternalHTML({ wpid: 42, size: "s", initialized: true });
    const anchor = dom.querySelector("a");

    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("https://op.internal/wp/42");
  });

  it("emits no link for a missing wpid", () => {
    initOpenProjectApi({ baseUrl: "https://example.com" });

    const dom = renderExternalHTML({ wpid: undefined, size: "m", initialized: false });

    expect(dom.querySelector("a")).toBeNull();
    expect(dom.textContent).toBe("");
  });

  it("emits no link for a non-positive wpid", () => {
    initOpenProjectApi({ baseUrl: "https://example.com" });

    const dom = renderExternalHTML({ wpid: 0, size: "m", initialized: true });

    expect(dom.querySelector("a")).toBeNull();
  });
});

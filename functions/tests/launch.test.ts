import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const script = readFileSync(new URL("../../web/public/launch.js", import.meta.url), "utf8");
const tenants = JSON.parse(readFileSync(new URL("../../seed/tenants.json", import.meta.url), "utf8")) as Record<string, {
  displayName: string; logoUrl: string; tokens: Record<string, string>;
}>;

async function launch(query: string, failBranding = false) {
  const elements = new Map<string, {
    textContent: string; disabled: boolean; src: string; alt: string;
    events: Record<string, () => void>; addEventListener: (event: string, callback: () => void) => void;
  }>();
  const element = (id: string) => {
    if (!elements.has(id)) {
      const events: Record<string, () => void> = {};
      elements.set(id, { textContent: "", disabled: true, src: "", alt: "", events,
        addEventListener: (event, callback) => { events[event] = callback; },
      });
    }
    return elements.get(id)!;
  };
  const assign = vi.fn();
  const styles = new Map<string, string>();
  runInNewContext(script, {
    URL, URLSearchParams, AbortSignal,
    window: {
      location: { search: query, origin: "https://portal.example", assign },
      history: { length: 1, back: vi.fn() },
    },
    document: { getElementById: element, documentElement: { style: {
      setProperty: (key: string, value: string) => styles.set(key, value),
    } }, title: "Launch Training" },
    fetch: vi.fn().mockResolvedValue({ ok: !failBranding, json: async () => tenants }),
  });
  // Allow the two awaited branding operations to settle.
  await new Promise<void>((resolve) => setImmediate(resolve));
  return { element, styles, assign };
}

describe("launch", () => {
  it("launch_twoTenants_applyDifferentDataDrivenThemes", async () => {
    for (const id of ["bayer", "corpuls"]) {
      const page = await launch(`?tenant=${id}&training=t1`);
      expect(page.element("tenantName").textContent).toBe(tenants[id].displayName);
      expect(page.element("tenantLogo").src).toBe(tenants[id].logoUrl);
      expect(Object.fromEntries(page.styles)).toEqual(tenants[id].tokens);
    }
  });

  it("launch_untrustedQueryValues_areRenderedAsText", async () => {
    const title = '<img src=x onerror="alert(1)">';
    const page = await launch(`?training=t1&title=${encodeURIComponent(title)}`);
    expect(page.element("trainingName").textContent).toBe(title);
  });

  it("launch_trainingIdWithReservedCharacters_isSafelyEncoded", async () => {
    const training = "t1&tenant=other#fragment";
    const page = await launch(`?training=${encodeURIComponent(training)}`);
    page.element("startTraining").events.click();
    const target = new URL(page.assign.mock.calls[0][0] as string);
    expect(target.pathname).toBe("/api/launch");
    expect(target.searchParams.get("training")).toBe(training);
    expect(target.searchParams.has("tenant")).toBe(false);
    expect(target.hash).toBe("");
  });

  it("launch_unknownTenant_usesDemoFallback", async () => {
    const page = await launch("?tenant=__proto__&training=t1");
    expect(page.element("tenantName").textContent).toBe(tenants.demo.displayName);
    expect(page.element("launchStatus").textContent).toContain("demo theme");
  });

  it("launch_missingTraining_disablesStart", async () => {
    const page = await launch("?tenant=bayer");
    expect(page.element("startTraining").disabled).toBe(true);
    page.element("startTraining").events.click();
    expect(page.assign).not.toHaveBeenCalled();
  });

  it("launch_brandingFailure_keepsStartEnabledAndExplainsFallback", async () => {
    const page = await launch("?training=t1", true);
    expect(page.element("startTraining").disabled).toBe(false);
    expect(page.element("launchStatus").textContent).toContain("could not load");
  });
});

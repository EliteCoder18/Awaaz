import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";
import { vi } from "vitest";
// jsdom has no viewport; browser tests exercise actual scroll animations.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  },
);
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
if (typeof window !== "undefined")
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    })),
    configurable: true,
  });

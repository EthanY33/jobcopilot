// jsdom does not implement window.matchMedia, but next-themes calls it on mount
// even when enableSystem={false}. Polyfill it for the test environment.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement IntersectionObserver, which ScrollReveal uses
// on mount. Provide a no-op shim so section tests can render. Tests that
// need to control the observer (e.g. scroll-reveal.test.tsx) override this
// with vi.stubGlobal in their own beforeEach.
if (typeof globalThis.IntersectionObserver === "undefined") {
  class NoopIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds: readonly number[] = [];
  }
  globalThis.IntersectionObserver = NoopIntersectionObserver as unknown as typeof IntersectionObserver;
}

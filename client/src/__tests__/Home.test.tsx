import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "../pages/Home";

function renderHome() {
  return renderToStaticMarkup(React.createElement(Home));
}

describe("Home landing page", () => {
  it("renders without crashing", () => {
    expect(renderHome()).toBeTruthy();
  });

  it("shows brand name", () => {
    expect(renderHome()).toMatch(/driveway/i);
  });

  it("shows estimator and saved-project CTAs", () => {
    const html = renderHome();
    expect(html).toContain("Open Estimator");
    expect(html).toContain("Saved Projects");
    expect(html).toContain('href="/estimator?start=upload"');
    expect(html).toContain('href="/dashboard"');
  });

  it("mentions starting with a driveway photo", () => {
    expect(renderHome()).toMatch(/start with a driveway photo/i);
  });

  it("shows the four step titles", () => {
    const html = renderHome();
    ["Capture", "Detect", "Price", "Share"].forEach(step => {
      expect(html).toContain(step);
    });
  });

  it("shows all four material names", () => {
    const html = renderHome();
    expect(html).toContain("Hot Mix Asphalt");
    expect(html).toContain("Asphalt Millings");
    expect(html).toMatch(/Tar (&amp;|&) Chip/);
    expect(html).toContain("Gravel");
  });
});

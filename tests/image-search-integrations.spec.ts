import { expect, test } from "@playwright/test";

test.describe("Image Search Integration APIs", () => {
  test("should load landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Smart Presentations|presentation/i);
  });

  test("should have image studio component files present", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const projectRoot = path.resolve(process.cwd());
    const requiredFiles = [
      "src/app/_actions/apps/image-studio/giphy.ts",
      "src/app/_actions/apps/image-studio/pixabay.ts",
      "src/app/_actions/apps/image-studio/pexels.ts",
      "src/components/presentation/shared/SharedImageSearchControls.tsx",
      "src/components/presentation/shared/SharedGifSearchControls.tsx",
    ];
    
    for (const file of requiredFiles) {
      const fullPath = path.join(projectRoot, file);
      const exists = fs.existsSync(fullPath);
      expect(exists, `Expected file ${file} to exist`).toBe(true);
    }
  });

  test("should have pexels provider in image search controls", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const projectRoot = path.resolve(process.cwd());
    const filePath = path.join(projectRoot, "src/components/presentation/shared/SharedImageSearchControls.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    
    expect(content.toLowerCase()).toContain("pexels");
  });

  test("should have giphy provider in gif search controls", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const projectRoot = path.resolve(process.cwd());
    const filePath = path.join(projectRoot, "src/components/presentation/shared/SharedGifSearchControls.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    
    expect(content.toLowerCase()).toContain("giphy");
  });

  test("should have pixabay implementation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const projectRoot = path.resolve(process.cwd());
    const filePath = path.join(projectRoot, "src/app/_actions/apps/image-studio/pixabay.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    
    expect(content).toContain("pixabay.com/api");
  });

  test("should have pexels implementation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const projectRoot = path.resolve(process.cwd());
    const filePath = path.join(projectRoot, "src/app/_actions/apps/image-studio/pexels.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    
    expect(content).toContain("api.pexels.com");
  });

  test("should call pixabay provider via test API", async ({ request }) => {
    test.setTimeout(120000);
    const response = await request.get("/api/test/image-search-providers?provider=pixabay&q=nature");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("should call pexels provider via test API", async ({ request }) => {
    test.setTimeout(120000);
    const response = await request.get("/api/test/image-search-providers?provider=pexels&q=nature");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("should call giphy provider via test API", async ({ request }) => {
    test.setTimeout(120000);
    const response = await request.get("/api/test/image-search-providers?provider=giphy&q=happy");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });
});

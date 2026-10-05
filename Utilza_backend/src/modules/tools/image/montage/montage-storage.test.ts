import { describe, it, expect } from "vitest";
import { tempStorage } from "../../../../lib/storage.js";
import { montageImage } from "./montage.service.js";
import sharp from "sharp";

describe("montage storage test", () => {
  it("stores and retrieves montage correctly", async () => {
    const images = [
      { r: 200, g: 50, b: 50 },
      { r: 50, g: 200, b: 50 },
      { r: 50, g: 50, b: 200 },
      { r: 200, g: 200, b: 50 },
    ];
    
    const inputs = [];
    for (const color of images) {
      const png = await sharp({
        create: { width: 100, height: 100, channels: 3, background: color },
      }).png().toBuffer();
      inputs.push({
        buffer: png,
        ext: 'png',
        mimeType: 'image/png',
        size: png.length,
        originalName: 'test.png',
      });
    }
    
    const ctx = {
      jobId: 'test',
      body: { cols: 2, rows: 2, gap: 4, background: '#ffffff' },
    };
    
    const result = await montageImage(inputs, ctx);
    console.log('Montage result:', { size: result.buffer.length, ext: result.ext, mimeType: result.mimeType });
    
    const stored = await tempStorage.put(result.buffer, { ext: result.ext, mimeType: result.mimeType });
    console.log('Stored:', stored);
    
    const retrieved = await tempStorage.get(stored.key);
    console.log('Retrieved length:', retrieved?.length);
    console.log('Match:', retrieved?.equals(result.buffer));
    
    const meta = await sharp(retrieved).metadata();
    console.log('Metadata:', meta);
    
    expect(retrieved?.length).toBe(result.buffer.length);
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(200);
  });
});
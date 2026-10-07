// Tool-definition registry — mirrors the backend contract exactly
// (WEB_APP_REQUIREMENTS §17 + API.md + backend schemas/routes).
// No invented tools, params, or limits. Server validation is authoritative.

export const PER_FILE_BYTES = 10 * 1024 * 1024;
const MB5 = 5 * 1024 * 1024;
const COMBINED50 = 50 * 1024 * 1024;

const IMG = ['.png', '.jpg', '.jpeg', '.webp'];
const COMMON = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.md', '.csv', '.json', '.docx', '.xlsx', '.html'];
const TEXTish = ['.txt', '.md', '.csv', '.json'];

// Generic field DSL: { name, label, type, required, minLength, maxLength,
// min, max, step, defaultValue, options, hint, placeholder }
// Types: text | number | select | textarea | json | url | domain | color
export const TOOL_DEFINITIONS = {
  /* ---------------- PDF (20) ---------------- */
  'pdf-merge': {
    endpoint: '/tools/pdf/merge',
    input: 'files',
    files: { min: 2, max: 20, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Select 2–20 PDF files. They are merged in the order shown.',
  },
  'pdf-split': {
    endpoint: '/tools/pdf/split',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'ranges', label: 'Page ranges', type: 'text', required: true, minLength: 1, maxLength: 200, placeholder: '1-3,5', hint: '1-based ranges, e.g. 1-3,5. At most 500 selected pages.' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Extract pages into a single new PDF. Also covers page extraction until burst ZIP arrives.',
  },
  'pdf-compress': {
    endpoint: '/tools/pdf/compress',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: ['Optimization only — images inside the PDF are not downsampled.'],
    helper: 'Produces an optimized PDF (metadata stripped, object streams).',
  },
  'pdf-to-word': {
    endpoint: '/tools/pdf/to-word',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: ['Text extraction only — layout is not preserved.', 'Scanned/image-only PDFs with no text layer fail.'],
    helper: 'Converts PDF text into an editable Word document (paragraphs per page, max 200 pages).',
  },
  'image-to-pdf': {
    endpoint: '/tools/pdf/from-image',
    input: 'files',
    files: { min: 1, max: 10, accept: ['.png', '.jpg', '.jpeg'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Serves JPG to PDF + PNG to PDF: one A4 page per image, never upscaled.',
  },
  'pdf-rotate': {
    endpoint: '/tools/pdf/rotate',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'angle', label: 'Angle', type: 'select', required: true, options: [{ value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' }], hint: 'Rotation is absolute.' },
      { name: 'ranges', label: 'Page ranges (optional)', type: 'text', maxLength: 200, placeholder: '1-3,5', hint: 'Defaults to all pages.' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Rotate pages by 90, 180, or 270 degrees.',
  },
  'pdf-page-delete': {
    endpoint: '/tools/pdf/delete-pages',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'ranges', label: 'Pages to delete', type: 'text', required: true, minLength: 1, maxLength: 200, placeholder: '2,4-5', hint: 'You cannot remove every page.' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Removes the selected pages from the PDF.',
  },
  'pdf-text': {
    endpoint: '/tools/pdf/text',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Extracts page text and counts — JSON result, no download.',
  },
  'pdf-metadata': {
    endpoint: '/tools/pdf/metadata',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Reads document metadata — JSON result, absent fields are null.',
  },
  'pdf-watermark': {
    endpoint: '/tools/pdf/watermark',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'text', label: 'Watermark text', type: 'text', required: true, minLength: 1, maxLength: 100 },
      { name: 'opacity', label: 'Opacity', type: 'number', min: 0.05, max: 0.5, step: 0.01, defaultValue: 0.15 },
      { name: 'size', label: 'Font size', type: 'number', min: 12, max: 144, step: 1, defaultValue: 48 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Stamps diagonal translucent text on every page.',
  },
  'pdf-number-pages': {
    endpoint: '/tools/pdf/number-pages',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'format', label: 'Format', type: 'select', options: [{ value: 'n-of-total', label: 'n of total' }, { value: 'n', label: 'n' }], defaultValue: 'n-of-total' },
      { name: 'size', label: 'Font size', type: 'number', min: 8, max: 36, step: 1, defaultValue: 10 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Adds bottom-center page numbers on every page.',
  },
  'pdf-header-footer': {
    endpoint: '/tools/pdf/header-footer',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'header', label: 'Header (optional)', type: 'text', minLength: 1, maxLength: 200 },
      { name: 'footer', label: 'Footer (optional)', type: 'text', minLength: 1, maxLength: 200 },
      { name: 'size', label: 'Font size', type: 'number', min: 8, max: 36, step: 1, defaultValue: 10 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Adds top/bottom-center text on every page. At least one of header or footer is required.',
    customValidate: (_files, params) => {
      const h = (params.header || '').trim();
      const f = (params.footer || '').trim();
      return h === '' && f === '' ? ['Provide a header, a footer, or both.'] : [];
    },
  },
  'pdf-reorder': {
    endpoint: '/tools/pdf/reorder',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'order', label: 'New page order', type: 'text', required: true, minLength: 1, maxLength: 500, placeholder: '3,1,2', hint: 'Complete comma-separated 1-based permutation — every page exactly once.' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Rearranges pages into the given order.',
  },
  'pdf-duplicate': {
    endpoint: '/tools/pdf/duplicate',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'ranges', label: 'Pages to duplicate', type: 'text', required: true, minLength: 1, maxLength: 200, placeholder: '1-3,5' },
      { name: 'times', label: 'Copies', type: 'number', min: 1, max: 10, step: 1, defaultValue: 1 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Appends extra copies of the selected pages.',
  },
  'pdf-flatten': {
    endpoint: '/tools/pdf/flatten',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Normalizes the file (drops incremental history). Metadata is preserved, unlike compress.',
  },
  'pdf-search': {
    endpoint: '/tools/pdf/search',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'query', label: 'Search text', type: 'text', required: true, minLength: 1, maxLength: 200 },
    ],
    result: 'json',
    warnings: [],
    helper: 'Case-insensitive search — JSON matches capped at 50.',
  },
  'pdf-redact': {
    endpoint: '/tools/pdf/redact',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'regions', label: 'Regions (JSON)', type: 'json', required: true, minLength: 2, maxLength: 20000, placeholder: '[{"page":1,"x":10,"y":10,"w":100,"h":20}]', hint: 'Up to 100 regions: {"page":1,"x":10,"y":10,"w":100,"h":20}.' },
    ],
    result: 'download',
    warnings: ['Visual cover only — underlying text stays extractable. Not for truly sensitive data.'],
    helper: 'Covers regions with black boxes. This is not secure redaction.',
  },
  'pdf-metadata-edit': {
    endpoint: '/tools/pdf/metadata-edit',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'title', label: 'Title (optional)', type: 'text', maxLength: 500 },
      { name: 'author', label: 'Author (optional)', type: 'text', maxLength: 500 },
      { name: 'subject', label: 'Subject (optional)', type: 'text', maxLength: 500 },
      { name: 'keywords', label: 'Keywords (optional)', type: 'text', maxLength: 500 },
      { name: 'producer', label: 'Producer (optional)', type: 'text', maxLength: 500 },
      { name: 'creator', label: 'Creator (optional)', type: 'text', maxLength: 500 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Updates PDF metadata. Empty string clears a field; omitted fields stay untouched. At least one field is required.',
    customValidate: (_files, params) => {
      const names = ['title', 'author', 'subject', 'keywords', 'producer', 'creator'];
      // Empty string clears a field, so presence (not non-emptiness) counts.
      const provided = names.some((n) => Object.prototype.hasOwnProperty.call(params || {}, n));
      return provided ? [] : ['Provide at least one metadata field.'];
    },
  },
  'pdf-to-image': {
    endpoint: '/tools/pdf/to-image',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.pdf'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'format', label: 'Format', type: 'select', options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }], defaultValue: 'png' },
      { name: 'pages', label: 'Pages (optional)', type: 'text', maxLength: 200, placeholder: '1-3,5', hint: 'Defaults to all pages, max 20.' },
      { name: 'scale', label: 'Scale', type: 'number', min: 1, max: 3, step: 1, defaultValue: 2 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Renders pages as images inside a ZIP (max 20 pages).',
  },
  'pdf-sign': {
    endpoint: '/tools/pdf/sign',
    input: 'files',
    files: { min: 2, max: 2, accept: ['.pdf', '.png', '.jpg', '.jpeg'], maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'page', label: 'Page', type: 'number', min: 1, step: 1, defaultValue: 1 },
      { name: 'x', label: 'X', type: 'number', min: 0, max: 2000, defaultValue: 50 },
      { name: 'y', label: 'Y', type: 'number', min: 0, max: 2000, defaultValue: 50 },
      { name: 'width', label: 'Width', type: 'number', min: 10, max: 500, step: 1, defaultValue: 150 },
    ],
    result: 'download',
    warnings: ['Visible stamp only — NOT a cryptographic signature.'],
    helper: 'Select exactly one PDF plus one signature image (PNG/JPG).',
  },

  /* ---------------- Image (19) ---------------- */
  'image-compress': {
    endpoint: '/tools/image/compress',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'quality', label: 'Quality', type: 'number', min: 1, max: 100, step: 1, defaultValue: 80 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Re-encodes at lower quality, same format, metadata stripped. No resizing.',
  },
  'image-convert': {
    endpoint: '/tools/image/convert',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'format', label: 'Format', type: 'select', required: true, options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }] },
    ],
    result: 'download',
    warnings: [],
    helper: 'Converts between PNG, JPG, and WebP at high quality, metadata stripped.',
  },
  'image-resize': {
    endpoint: '/tools/image/resize',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'width', label: 'Width px (optional)', type: 'number', min: 1, max: 8000, step: 1 },
      { name: 'height', label: 'Height px (optional)', type: 'number', min: 1, max: 8000, step: 1 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Aspect-preserved resize, never upscaled. At least one of width or height is required.',
    customValidate: (_files, params) => {
      const w = String(params.width ?? '').trim();
      const h = String(params.height ?? '').trim();
      return w === '' && h === '' ? ['Provide a width, a height, or both.'] : [];
    },
  },
  'image-crop': {
    endpoint: '/tools/image/crop',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'left', label: 'Left', type: 'number', required: true, min: 0, max: 8000, step: 1, defaultValue: 0 },
      { name: 'top', label: 'Top', type: 'number', required: true, min: 0, max: 8000, step: 1, defaultValue: 0 },
      { name: 'width', label: 'Width', type: 'number', required: true, min: 1, max: 8000, step: 1 },
      { name: 'height', label: 'Height', type: 'number', required: true, min: 1, max: 8000, step: 1 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Crops an exact region. The backend verifies it fits the real dimensions.',
  },
  'image-rotate': {
    endpoint: '/tools/image/rotate',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'angle', label: 'Angle', type: 'select', required: true, options: [{ value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' }], hint: 'Physically rotated pixels (dimensions swap on 90°).' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Rotates image pixels by 90, 180, or 270 degrees.',
  },
  'image-flip': {
    endpoint: '/tools/image/flip',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'direction', label: 'Direction', type: 'select', required: true, options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] },
    ],
    result: 'download',
    warnings: [],
    helper: 'Mirrors the image, same format.',
  },
  'image-grayscale': {
    endpoint: '/tools/image/grayscale',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts the image to grayscale, same format.',
  },
  'image-blur': {
    endpoint: '/tools/image/blur',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'sigma', label: 'Strength', type: 'number', min: 0.3, max: 50, step: 0.1, defaultValue: 5 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Blurs the image with adjustable strength.',
  },
  'image-sharpen': {
    endpoint: '/tools/image/sharpen',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'sigma', label: 'Strength', type: 'number', min: 0.5, max: 10, step: 0.1, defaultValue: 1 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Sharpens image details.',
  },
  'image-brightness': {
    endpoint: '/tools/image/brightness',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'level', label: 'Level', type: 'number', min: 0.1, max: 3, step: 0.1, defaultValue: 1.2 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Adjusts image brightness.',
  },
  'image-contrast': {
    endpoint: '/tools/image/contrast',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'level', label: 'Level', type: 'number', min: 0.1, max: 3, step: 0.1, defaultValue: 1.2 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Adjusts image contrast (linear around midpoint).',
  },
  'image-pixelate': {
    endpoint: '/tools/image/pixelate',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'blocks', label: 'Blocks', type: 'number', min: 4, max: 100, step: 1, defaultValue: 20 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Nearest-neighbor pixelation, same dimensions.',
  },
  'image-watermark': {
    endpoint: '/tools/image/watermark',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'text', label: 'Text', type: 'text', required: true, minLength: 1, maxLength: 100 },
      { name: 'position', label: 'Position', type: 'select', options: [{ value: 'top-left', label: 'Top left' }, { value: 'top-right', label: 'Top right' }, { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-right', label: 'Bottom right' }, { value: 'center', label: 'Center' }], defaultValue: 'bottom-right' },
      { name: 'opacity', label: 'Opacity', type: 'number', min: 0.05, max: 0.8, step: 0.01, defaultValue: 0.5 },
      { name: 'size', label: 'Font size', type: 'number', min: 8, max: 144, step: 1, defaultValue: 24 },
    ],
    result: 'download',
    warnings: [],
    helper: 'Overlays a text label on the image.',
  },
  'image-metadata': {
    endpoint: '/tools/image/metadata',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Image dimensions and format as JSON — never echoes bytes.',
  },
  'image-exif-remove': {
    endpoint: '/tools/image/exif-remove',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Near-lossless re-encode with all metadata dropped.',
  },
  'image-favicon': {
    endpoint: '/tools/image/favicon',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Generates a ZIP of 16/32/48/180/192px PNGs plus site.webmanifest.',
  },
  'image-social': {
    endpoint: '/tools/image/social',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'preset', label: 'Preset', type: 'select', required: true, options: [{ value: 'og', label: 'OG (1200×630)' }, { value: 'square', label: 'Square (1080×1080)' }, { value: 'story', label: 'Story (1080×1920)' }, { value: 'banner', label: 'Banner (1500×500)' }] },
    ],
    result: 'download',
    warnings: [],
    helper: 'Cover-fit resize onto a social canvas.',
  },
  'image-passport': {
    endpoint: '/tools/image/passport',
    input: 'files',
    files: { min: 1, max: 1, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Center 413×531 crop (35×45mm at 300dpi). No face detection.',
  },
  'image-montage': {
    endpoint: '/tools/image/montage',
    input: 'files',
    files: { min: 2, max: 9, accept: IMG, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'cols', label: 'Columns', type: 'number', min: 1, max: 3, step: 1, defaultValue: 2 },
      { name: 'rows', label: 'Rows', type: 'number', min: 1, max: 3, step: 1, defaultValue: 2 },
      { name: 'gap', label: 'Gap px', type: 'number', min: 0, max: 50, step: 1, defaultValue: 4 },
      { name: 'background', label: 'Background', type: 'color', defaultValue: '#ffffff' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Grid montage — the file count must exactly equal columns × rows.',
    customValidate: (files, params) => {
      const cols = Number(params.cols ?? 2);
      const rows = Number(params.rows ?? 2);
      if (Number.isFinite(cols) && Number.isFinite(rows) && files.length !== cols * rows) {
        return [`Select exactly ${cols * rows} images for a ${cols}×${rows} grid (currently ${files.length}).`];
      }
      return [];
    },
  },

  /* ---------------- Document (13) ---------------- */
  'word-to-pdf': {
    endpoint: '/tools/document/to-pdf',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.docx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: ['Extracted/re-rendered text — tables, images, and columns are not preserved. Only Latin, Greek, Cyrillic and common symbols render; other characters are rejected.'],
    helper: 'Converts Word text into a PDF (max 2000 paragraphs).',
  },
  'word-to-txt': {
    endpoint: '/tools/document/word-to-txt',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.docx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Extracts plain text (paragraphs separated by blank lines).',
  },
  'word-to-html': {
    endpoint: '/tools/document/word-to-html',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.docx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts to an escaped single-page HTML download.',
  },
  'word-to-markdown': {
    endpoint: '/tools/document/word-to-markdown',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.docx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts to Markdown (plain paragraphs).',
  },
  'txt-to-pdf': {
    endpoint: '/tools/document/txt-to-pdf',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.txt'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: ['Only Latin, Greek, Cyrillic and common symbols render — other characters are rejected.'],
    helper: 'Renders a UTF-8 text file (max 2000 lines) as a paginated PDF.',
  },
  'excel-to-csv': {
    endpoint: '/tools/document/excel-to-csv',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.xlsx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'First worksheet as CSV (header row included). Legacy .xls is unsupported.',
  },
  'excel-to-json': {
    endpoint: '/tools/document/excel-to-json',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.xlsx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'First worksheet as a JSON array (first row = keys).',
  },
  'csv-to-json': {
    endpoint: '/tools/document/csv-to-json',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.csv'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts CSV rows to a JSON array download.',
  },
  'csv-to-excel': {
    endpoint: '/tools/document/csv-to-excel',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.csv'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts a CSV file to .xlsx.',
  },
  'json-to-csv': {
    endpoint: '/tools/document/json-to-csv',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.json'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Array of objects only (max 50k rows / 100 columns). Nested values are JSON-encoded.',
  },
  'markdown-to-html': {
    endpoint: '/tools/document/markdown-to-html',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.md', '.markdown'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Renders Markdown (max 500k chars) as standalone HTML. Default to download — sandbox before embedding (scripts stripped, not a full sanitization policy).',
  },
  'document-metadata': {
    endpoint: '/tools/document/metadata',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.docx', '.xlsx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Document metadata as JSON — absent fields are null.',
  },
  'document-compress': {
    endpoint: '/tools/document/compress',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.docx', '.xlsx'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Repacks at max DEFLATE. Gains are usually small; output is always normalized.',
  },

  /* ---------------- File / archive (16) ---------------- */
  'zip-create': {
    endpoint: '/tools/file/zip-create',
    input: 'files',
    files: { min: 2, max: 20, accept: COMMON, maxSize: PER_FILE_BYTES, combinedMax: COMBINED50 },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Combines files into a ZIP (executables blocked, 50 MB combined cap, sanitized names).',
  },
  'zip-extract': {
    endpoint: '/tools/file/zip-extract',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.zip'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'manifest',
    warnings: [],
    helper: 'Lists archive contents (max 50 entries, 50 MB uncompressed) with per-file downloads.',
  },
  'file-hash': {
    endpoint: '/tools/file/hash',
    input: 'files',
    files: { min: 1, max: 1, accept: [], maxSize: PER_FILE_BYTES, requireExt: true },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Computes SHA-256/SHA-512 and size. Bytes are hashed, never stored. Any type with an extension.',
  },
  'base64-encode': {
    endpoint: '/tools/file/base64-encode',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.md', '.csv', '.json', '.bin'], maxSize: MB5 },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Encodes a file (max 5 MB) as Base64 text.',
  },
  'base64-decode': {
    endpoint: '/tools/file/base64-decode',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.txt', '.b64', '.md', '.csv', '.json'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Decodes Base64 text to raw bytes. Strict: invalid characters fail.',
  },
  'file-metadata': {
    endpoint: '/tools/file/metadata',
    input: 'files',
    files: { min: 1, max: 1, accept: [], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Inspects type, hash, and text stats. File is inspected, never stored.',
  },
  'file-type': {
    endpoint: '/tools/file/type',
    input: 'files',
    files: { min: 1, max: 1, accept: [], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'json',
    warnings: [],
    helper: 'Sniffs content type — the extension is ignored.',
  },
  'file-merge': {
    endpoint: '/tools/file/merge',
    input: 'files',
    files: { min: 2, max: 20, accept: TEXTish, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Concatenates 2–20 text files. All files must share one extension.',
  },
  'file-split': {
    endpoint: '/tools/file/split',
    input: 'files',
    files: { min: 1, max: 1, accept: TEXTish, maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Splits a text file into a ZIP of at most 20 even line chunks.',
  },
  'file-compress': {
    endpoint: '/tools/file/compress',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.txt', '.md', '.csv', '.json', '.html', '.bin'], maxSize: MB5 },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Compresses one file (max 5 MB) to gzip.',
  },
  'file-rename': {
    endpoint: '/tools/file/rename',
    input: 'files',
    files: { min: 2, max: 20, accept: COMMON, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'pattern', label: 'Rename pattern', type: 'text', required: true, minLength: 1, maxLength: 100, placeholder: 'photo-{i}', hint: 'Must contain {i} (1-based index). Safe characters only; executables blocked.' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Batch-renames into a ZIP. {i} is replaced by the 1-based index.',
    customValidate: (_files, params) => {
      return String(params.pattern ?? '').includes('{i}') ? [] : ['Pattern must contain {i} (e.g. photo-{i}).'];
    },
  },
  'folder-to-zip': {
    endpoint: '/tools/file/folder-to-zip',
    input: 'files',
    files: { min: 2, max: 20, accept: COMMON, maxSize: PER_FILE_BYTES },
    fields: [
      { name: 'paths', label: 'Paths (JSON array)', type: 'json', required: true, minLength: 2, placeholder: '["docs/a.txt","img/b.txt"]', hint: 'One relative path per file, in order. No "..".' },
    ],
    result: 'download',
    warnings: [],
    helper: 'Zips files while preserving folder structure. Paths must parallel the file count.',
    customValidate: (files, params) => {
      try {
        const paths = JSON.parse(String(params.paths ?? ''));
        if (!Array.isArray(paths)) return ['Paths must be a JSON array.'];
        if (paths.length !== files.length) return [`Paths must match the file count (${files.length}).`];
        if (paths.some((p) => typeof p !== 'string' || p.trim() === '' || p.includes('..'))) {
          return ['Each path must be a non-empty relative path without "..".'];
        }
        return [];
      } catch {
        return ['Paths must be valid JSON.'];
      }
    },
  },
  'tar-create': {
    endpoint: '/tools/file/tar-create',
    input: 'files',
    files: { min: 2, max: 20, accept: COMMON, maxSize: PER_FILE_BYTES, combinedMax: COMBINED50 },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Combines files into a .tgz (50 MB combined cap).',
  },
  'tar-extract': {
    endpoint: '/tools/file/tar-extract',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.tar', '.tgz', '.gz'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Extracts a tarball as a ZIP (max 50 entries, 50 MB cap; non-file entries skipped).',
  },
  'zip-to-tar': {
    endpoint: '/tools/file/zip-to-tar',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.zip'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts a ZIP archive to .tgz.',
  },
  'tar-to-zip': {
    endpoint: '/tools/file/tar-to-zip',
    input: 'files',
    files: { min: 1, max: 1, accept: ['.tar', '.tgz'], maxSize: PER_FILE_BYTES },
    fields: [],
    result: 'download',
    warnings: [],
    helper: 'Converts a tarball to .zip.',
  },

  /* ---------------- URL (4) ---------------- */
  'url-status': {
    endpoint: '/tools/url/status',
    input: 'url',
    files: null,
    fields: [
      { name: 'url', label: 'URL', type: 'url', required: true, minLength: 1, maxLength: 2000, placeholder: 'https://example.com', hint: 'Full URL, up to 2000 characters.' },
    ],
    result: 'json',
    warnings: [],
    helper: 'Checks status, redirects, and content headers (SSRF-guarded, 1 MB cap).',
  },
  'url-metadata': {
    endpoint: '/tools/url/metadata',
    input: 'url',
    files: null,
    fields: [
      { name: 'url', label: 'URL', type: 'url', required: true, minLength: 1, maxLength: 2000, placeholder: 'https://example.com', hint: 'HTML pages only — non-HTML fails with 400.' },
    ],
    result: 'json',
    warnings: [],
    helper: 'Extracts title, description, and Open Graph tags.',
  },
  'dns-lookup': {
    endpoint: '/tools/url/dns',
    input: 'url',
    files: null,
    fields: [
      { name: 'domain', label: 'Domain', type: 'domain', required: true, minLength: 1, maxLength: 253, placeholder: 'example.com', hint: 'Bare domain, no IPs. Missing record types return null.' },
    ],
    result: 'json',
    warnings: [],
    helper: 'Looks up A, AAAA, MX, TXT, and NS records.',
  },
  'ssl-check': {
    endpoint: '/tools/url/ssl',
    input: 'url',
    files: null,
    fields: [
      { name: 'domain', label: 'Domain', type: 'domain', required: true, minLength: 1, maxLength: 253, placeholder: 'example.com', hint: 'Port fixed 443. IP literals and private-resolving domains are refused.' },
    ],
    result: 'json',
    warnings: [],
    helper: 'Inspects the TLS certificate: subject, issuer, validity, days left, fingerprint.',
  },
};

export function getToolDefinition(slug) {
  return TOOL_DEFINITIONS[slug] || null;
}

export function isFrontendTool(apiTool) {
  return apiTool?.implementation === 'frontend';
}

// Client-side assistance only — backend validation is authoritative.
export function validateParams(def, values) {
  const errors = {};
  for (const field of def?.fields || []) {
    const raw = values?.[field.name];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.name] = 'This field is required.';
      continue;
    }
    if (value === undefined || value === null || value === '') continue;
    const str = String(value);
    if (field.minLength && str.length < field.minLength) {
      errors[field.name] = `Use at least ${field.minLength} characters.`;
    } else if (field.maxLength && str.length > field.maxLength) {
      errors[field.name] = `Use at most ${field.maxLength} characters.`;
    } else if (field.type === 'url') {
      try {
        const u = new URL(str);
        if (!['http:', 'https:'].includes(u.protocol)) {
          errors[field.name] = 'Use an http(s) URL.';
        }
      } catch {
        errors[field.name] = 'Enter a valid URL.';
      }
    } else if (field.type === 'domain') {
      if (!/^(?!-)[a-z0-9-]{1,63}(\.(?!-)[a-z0-9-]{1,63})*$/i.test(str) || str.length > 253) {
        errors[field.name] = 'Enter a valid hostname (no IPs).';
      }
    } else if (field.type === 'color') {
      if (!/^#[0-9a-f]{6}$/i.test(str)) {
        errors[field.name] = 'Use a hex color like #ffffff.';
      }
    } else if (field.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n)) errors[field.name] = 'Enter a number.';
      else if (field.min !== undefined && n < field.min) errors[field.name] = `Minimum ${field.min}.`;
      else if (field.max !== undefined && n > field.max) errors[field.name] = `Maximum ${field.max}.`;
    }
  }
  return errors;
}

export function validateFiles(def, files) {
  const cfg = def?.files;
  if (!cfg) return [];
  const problems = [];
  if (files.length < cfg.min) {
    problems.push(`Select at least ${cfg.min} file${cfg.min === 1 ? '' : 's'}.`);
  }
  if (files.length > cfg.max) {
    problems.push(`Select at most ${cfg.max} files.`);
  }
  const allowed = new Set((cfg.accept || []).map((a) => a.toLowerCase().replace(/^\./, '')));
  files.forEach((f) => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const hasExt = f.name.includes('.') && ext !== '';
    if (cfg.requireExt && !hasExt) {
      problems.push(`${f.name}: file must have an extension.`);
    }
    if (allowed.size > 0 && (!hasExt || !allowed.has(ext))) {
      problems.push(`${f.name}: unsupported type — expected ${cfg.accept.join(', ')}.`);
    }
    if (f.size <= 0 || f.size > cfg.maxSize) {
      problems.push(`${f.name}: size out of range (max ${(cfg.maxSize / 1024 / 1024).toFixed(0)} MB per file).`);
    }
  });
  if (cfg.combinedMax) {
    const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (total > cfg.combinedMax) {
      problems.push(
        `Combined size ${(total / 1024 / 1024).toFixed(1)} MB exceeds the ${(cfg.combinedMax / 1024 / 1024).toFixed(0)} MB combined cap.`,
      );
    }
  }
  return problems;
}

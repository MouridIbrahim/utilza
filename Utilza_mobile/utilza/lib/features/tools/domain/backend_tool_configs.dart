import 'tool_executor_config.dart';

const int _mb5 = 5 * 1024 * 1024;
const int _mb10 = 10 * 1024 * 1024;
const int _mb50 = 50 * 1024 * 1024;

const _pdf = {'pdf'};
const _images = {'png', 'jpg', 'jpeg'};
const _imagesWebp = {'png', 'jpg', 'jpeg', 'webp'};

// Cross-field validators (top-level so configs stay const).

String? _requireHeaderOrFooter(Map<String, dynamic> v, int _) {
  final header = (v['header'] as String?)?.trim() ?? '';
  final footer = (v['footer'] as String?)?.trim() ?? '';
  if (header.isEmpty && footer.isEmpty) {
    return 'Provide a header and/or footer.';
  }
  return null;
}

String? _requireOneMetadataField(Map<String, dynamic> v, int _) {
  const keys = [
    'title',
    'author',
    'subject',
    'keywords',
    'producer',
    'creator'
  ];
  for (final k in keys) {
    if (((v[k] as String?) ?? '').trim().isNotEmpty) return null;
  }
  return 'Provide at least one metadata field.';
}

String? _requirePatternI(Map<String, dynamic> v, int _) {
  final pattern = (v['pattern'] as String?) ?? '';
  if (!pattern.contains('{i}')) {
    return 'Pattern must contain {i}, e.g. document-{i}.';
  }
  return null;
}

String? _requireResizeDim(Map<String, dynamic> v, int _) {
  if (v['width'] == null && v['height'] == null) {
    return 'Provide a width and/or height.';
  }
  return null;
}

String? _montageMatchesGrid(Map<String, dynamic> v, int files) {
  final cols = (v['cols'] as num?)?.toInt() ?? 2;
  final rows = (v['rows'] as num?)?.toInt() ?? 2;
  if (files != cols * rows) {
    return 'Select exactly cols × rows files ($cols × $rows = ${cols * rows}).';
  }
  return null;
}

// ---------------------------------------------------------------- PDF ---

const _pdfMerge = ToolExecutorConfig(
  endpoint: '/tools/pdf/merge',
  minFiles: 2,
  maxFiles: 20,
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _pdfSplit = ToolExecutorConfig(
  endpoint: '/tools/pdf/split',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'ranges',
      label: 'Page ranges (e.g. 1-3,5)',
      required: true,
      maxLength: 200,
      hint: 'Up to 500 selected pages.',
    ),
  ],
  resultType: ToolResultType.file,
);

const _pdfCompress = ToolExecutorConfig(
  endpoint: '/tools/pdf/compress',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _pdfToWord = ToolExecutorConfig(
  endpoint: '/tools/pdf/to-word',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Text-only layout, up to 200 pages. '
      'Scanned image-only PDFs without a text layer are not supported.',
);

const _pdfFromImage = ToolExecutorConfig(
  endpoint: '/tools/pdf/from-image',
  minFiles: 1,
  maxFiles: 10,
  allowedExtensions: _images,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _pdfRotate = ToolExecutorConfig(
  endpoint: '/tools/pdf/rotate',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'angle',
      label: 'Angle',
      type: ToolFieldType.select,
      required: true,
      options: ['90', '180', '270'],
      hint: 'Rotation is absolute.',
    ),
    ToolField(name: 'ranges', label: 'Ranges (optional)', maxLength: 200),
  ],
  resultType: ToolResultType.file,
);

const _pdfDeletePages = ToolExecutorConfig(
  endpoint: '/tools/pdf/delete-pages',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(name: 'ranges', label: 'Pages to delete', required: true),
  ],
  resultType: ToolResultType.file,
  notice: 'You cannot remove all pages.',
);

const _pdfWatermark = ToolExecutorConfig(
  endpoint: '/tools/pdf/watermark',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'text',
      label: 'Watermark text',
      required: true,
      minLength: 1,
      maxLength: 100,
    ),
    ToolField(
      name: 'opacity',
      label: 'Opacity (0.05–0.5)',
      type: ToolFieldType.number,
      min: 0.05,
      max: 0.5,
      defaultValue: '0.15',
    ),
    ToolField(
      name: 'size',
      label: 'Size (12–144)',
      type: ToolFieldType.integer,
      min: 12,
      max: 144,
      defaultValue: '48',
    ),
  ],
  resultType: ToolResultType.file,
);

const _pdfNumberPages = ToolExecutorConfig(
  endpoint: '/tools/pdf/number-pages',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'format',
      label: 'Format',
      type: ToolFieldType.select,
      required: true,
      options: ['n-of-total', 'n'],
    ),
    ToolField(
      name: 'size',
      label: 'Size (8–36)',
      type: ToolFieldType.integer,
      min: 8,
      max: 36,
      defaultValue: '10',
    ),
  ],
  resultType: ToolResultType.file,
);

const _pdfHeaderFooter = ToolExecutorConfig(
  endpoint: '/tools/pdf/header-footer',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(name: 'header', label: 'Header', maxLength: 200),
    ToolField(name: 'footer', label: 'Footer', maxLength: 200),
    ToolField(
      name: 'size',
      label: 'Size (8–36)',
      type: ToolFieldType.integer,
      min: 8,
      max: 36,
    ),
  ],
  resultType: ToolResultType.file,
  extraValidate: _requireHeaderOrFooter,
);

const _pdfReorder = ToolExecutorConfig(
  endpoint: '/tools/pdf/reorder',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'order',
      label: 'Page order (e.g. 3,1,2)',
      required: true,
      hint: 'Must contain every page exactly once.',
    ),
  ],
  resultType: ToolResultType.file,
);

const _pdfDuplicate = ToolExecutorConfig(
  endpoint: '/tools/pdf/duplicate',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(name: 'ranges', label: 'Ranges', required: true),
    ToolField(
      name: 'times',
      label: 'Times (1–10)',
      type: ToolFieldType.integer,
      min: 1,
      max: 10,
      defaultValue: '1',
    ),
  ],
  resultType: ToolResultType.file,
);

const _pdfFlatten = ToolExecutorConfig(
  endpoint: '/tools/pdf/flatten',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _pdfRedact = ToolExecutorConfig(
  endpoint: '/tools/pdf/redact',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'regions',
      label: 'Regions JSON [{"page":1,"x":10,"y":10,"w":100,"h":20}]',
      required: true,
      hint: 'Maximum 100 regions.',
    ),
  ],
  resultType: ToolResultType.file,
  notice: 'Visual cover only — underlying PDF text remains extractable. '
      'Do not use as secure permanent redaction.',
);

const _pdfToImage = ToolExecutorConfig(
  endpoint: '/tools/pdf/to-image',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'format',
      label: 'Format',
      type: ToolFieldType.select,
      required: true,
      options: ['png', 'jpg'],
    ),
    ToolField(name: 'pages', label: 'Pages (optional)'),
    ToolField(
      name: 'scale',
      label: 'Scale (1–3)',
      type: ToolFieldType.number,
      min: 1,
      max: 3,
      defaultValue: '2',
    ),
  ],
  resultType: ToolResultType.file,
  notice: 'Up to 20 pages. Returns a ZIP of images.',
);

const _pdfSign = ToolExecutorConfig(
  endpoint: '/tools/pdf/sign',
  minFiles: 2,
  maxFiles: 2,
  allowedExtensions: {'pdf', 'png', 'jpg', 'jpeg'},
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'page',
      label: 'Page',
      type: ToolFieldType.integer,
      defaultValue: '1',
    ),
    ToolField(
      name: 'x',
      label: 'X',
      type: ToolFieldType.integer,
      defaultValue: '50',
    ),
    ToolField(
      name: 'y',
      label: 'Y',
      type: ToolFieldType.integer,
      defaultValue: '50',
    ),
    ToolField(
      name: 'width',
      label: 'Width',
      type: ToolFieldType.integer,
      defaultValue: '150',
    ),
  ],
  resultType: ToolResultType.file,
  notice: 'Visible image stamp, NOT a cryptographic signature. '
      'Select the PDF first, then the signature image.',
);

const _pdfText = ToolExecutorConfig(
  endpoint: '/tools/pdf/text',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
);

const _pdfMetadata = ToolExecutorConfig(
  endpoint: '/tools/pdf/metadata',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
);

const _pdfSearch = ToolExecutorConfig(
  endpoint: '/tools/pdf/search',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'query',
      label: 'Search query',
      required: true,
      minLength: 1,
      maxLength: 200,
    ),
  ],
  resultType: ToolResultType.json,
);

const _pdfMetadataEdit = ToolExecutorConfig(
  endpoint: '/tools/pdf/metadata-edit',
  allowedExtensions: _pdf,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(name: 'title', label: 'Title', maxLength: 500),
    ToolField(name: 'author', label: 'Author', maxLength: 500),
    ToolField(name: 'subject', label: 'Subject', maxLength: 500),
    ToolField(name: 'keywords', label: 'Keywords', maxLength: 500),
    ToolField(name: 'producer', label: 'Producer', maxLength: 500),
    ToolField(name: 'creator', label: 'Creator', maxLength: 500),
  ],
  resultType: ToolResultType.file,
  extraValidate: _requireOneMetadataField,
  notice: 'Empty string clears a field. Omitted fields stay unchanged.',
);

// --------------------------------------------------------------- Image ---

const _imageCompress = ToolExecutorConfig(
  endpoint: '/tools/image/compress',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'quality',
      label: 'Quality (1–100)',
      type: ToolFieldType.integer,
      min: 1,
      max: 100,
      defaultValue: '80',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageConvert = ToolExecutorConfig(
  endpoint: '/tools/image/convert',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'format',
      label: 'Format',
      type: ToolFieldType.select,
      required: true,
      options: ['png', 'jpg', 'webp'],
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageResize = ToolExecutorConfig(
  endpoint: '/tools/image/resize',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'width',
      label: 'Width (1–8000)',
      type: ToolFieldType.integer,
      min: 1,
      max: 8000,
    ),
    ToolField(
      name: 'height',
      label: 'Height (1–8000)',
      type: ToolFieldType.integer,
      min: 1,
      max: 8000,
    ),
  ],
  resultType: ToolResultType.file,
  extraValidate: _requireResizeDim,
  notice: 'Aspect ratio is preserved. Upscaling is not allowed.',
);

const _imageCrop = ToolExecutorConfig(
  endpoint: '/tools/image/crop',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
        name: 'left', label: 'Left', type: ToolFieldType.integer, required: true),
    ToolField(
        name: 'top', label: 'Top', type: ToolFieldType.integer, required: true),
    ToolField(
        name: 'width',
        label: 'Width',
        type: ToolFieldType.integer,
        required: true),
    ToolField(
        name: 'height',
        label: 'Height',
        type: ToolFieldType.integer,
        required: true),
  ],
  resultType: ToolResultType.file,
  notice: 'Crop must fit the actual image dimensions.',
);

const _imageRotate = ToolExecutorConfig(
  endpoint: '/tools/image/rotate',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'angle',
      label: 'Angle',
      type: ToolFieldType.select,
      required: true,
      options: ['90', '180', '270'],
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageFlip = ToolExecutorConfig(
  endpoint: '/tools/image/flip',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'direction',
      label: 'Direction',
      type: ToolFieldType.select,
      required: true,
      options: ['horizontal', 'vertical'],
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageGrayscale = ToolExecutorConfig(
  endpoint: '/tools/image/grayscale',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _imageBlur = ToolExecutorConfig(
  endpoint: '/tools/image/blur',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'sigma',
      label: 'Sigma (0.3–50)',
      type: ToolFieldType.number,
      min: 0.3,
      max: 50,
      defaultValue: '5',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageSharpen = ToolExecutorConfig(
  endpoint: '/tools/image/sharpen',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'sigma',
      label: 'Sigma (0.5–10)',
      type: ToolFieldType.number,
      min: 0.5,
      max: 10,
      defaultValue: '1',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageBrightness = ToolExecutorConfig(
  endpoint: '/tools/image/brightness',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'level',
      label: 'Level (0.1–3)',
      type: ToolFieldType.number,
      min: 0.1,
      max: 3,
      defaultValue: '1.2',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageContrast = ToolExecutorConfig(
  endpoint: '/tools/image/contrast',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'level',
      label: 'Level (0.1–3)',
      type: ToolFieldType.number,
      min: 0.1,
      max: 3,
      defaultValue: '1.2',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imagePixelate = ToolExecutorConfig(
  endpoint: '/tools/image/pixelate',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'blocks',
      label: 'Blocks (4–100)',
      type: ToolFieldType.integer,
      min: 4,
      max: 100,
      defaultValue: '20',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageWatermark = ToolExecutorConfig(
  endpoint: '/tools/image/watermark',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'text',
      label: 'Watermark text',
      required: true,
      minLength: 1,
      maxLength: 100,
    ),
    ToolField(
      name: 'position',
      label: 'Position',
      type: ToolFieldType.select,
      required: true,
      options: [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'center'
      ],
    ),
    ToolField(
      name: 'opacity',
      label: 'Opacity (0.05–0.8)',
      type: ToolFieldType.number,
      min: 0.05,
      max: 0.8,
      defaultValue: '0.5',
    ),
    ToolField(
      name: 'size',
      label: 'Size (8–144)',
      type: ToolFieldType.integer,
      min: 8,
      max: 144,
      defaultValue: '24',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imageExifRemove = ToolExecutorConfig(
  endpoint: '/tools/image/exif-remove',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _imageFavicon = ToolExecutorConfig(
  endpoint: '/tools/image/favicon',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Returns a ZIP with 16/32/48/180/192px PNGs + site.webmanifest.',
);

const _imageSocial = ToolExecutorConfig(
  endpoint: '/tools/image/social',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'preset',
      label: 'Preset',
      type: ToolFieldType.select,
      required: true,
      options: ['og', 'square', 'story', 'banner'],
      hint: 'og 1200x630 • square 1080x1080 • story 1080x1920 • banner 1500x500',
    ),
  ],
  resultType: ToolResultType.file,
);

const _imagePassport = ToolExecutorConfig(
  endpoint: '/tools/image/passport',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Center crop to 413x531. There is no face detection.',
);

const _imageMontage = ToolExecutorConfig(
  endpoint: '/tools/image/montage',
  minFiles: 2,
  maxFiles: 9,
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  fields: [
    ToolField(
      name: 'cols',
      label: 'Columns (1–3)',
      type: ToolFieldType.integer,
      min: 1,
      max: 3,
      defaultValue: '2',
    ),
    ToolField(
      name: 'rows',
      label: 'Rows (1–3)',
      type: ToolFieldType.integer,
      min: 1,
      max: 3,
      defaultValue: '2',
    ),
    ToolField(
      name: 'gap',
      label: 'Gap (0–50)',
      type: ToolFieldType.integer,
      min: 0,
      max: 50,
      defaultValue: '4',
    ),
    ToolField(
      name: 'background',
      label: 'Background hex',
      defaultValue: '#ffffff',
    ),
  ],
  resultType: ToolResultType.file,
  extraValidate: _montageMatchesGrid,
  notice: 'File count must equal cols × rows.',
);

const _imageMetadata = ToolExecutorConfig(
  endpoint: '/tools/image/metadata',
  allowedExtensions: _imagesWebp,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
);

// ------------------------------------------------------------ Document ---

const _docx = {'docx'};
const _docxXlsx = {'docx', 'xlsx'};

const _documentToPdf = ToolExecutorConfig(
  endpoint: '/tools/document/to-pdf',
  allowedExtensions: _docx,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Text-level conversion, Latin scripts only. '
      'Tables, images and columns are not preserved. Max 2000 paragraphs.',
);

const _wordToTxt = ToolExecutorConfig(
  endpoint: '/tools/document/word-to-txt',
  allowedExtensions: _docx,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _wordToHtml = ToolExecutorConfig(
  endpoint: '/tools/document/word-to-html',
  allowedExtensions: _docx,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _wordToMarkdown = ToolExecutorConfig(
  endpoint: '/tools/document/word-to-markdown',
  allowedExtensions: _docx,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _txtToPdf = ToolExecutorConfig(
  endpoint: '/tools/document/txt-to-pdf',
  allowedExtensions: {'txt'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'UTF-8 text, maximum 2000 lines.',
);

const _excelToCsv = ToolExecutorConfig(
  endpoint: '/tools/document/excel-to-csv',
  allowedExtensions: {'xlsx'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'First worksheet only. .xls is unsupported.',
);

const _excelToJson = ToolExecutorConfig(
  endpoint: '/tools/document/excel-to-json',
  allowedExtensions: {'xlsx'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'First row becomes JSON keys.',
);

const _csvToJson = ToolExecutorConfig(
  endpoint: '/tools/document/csv-to-json',
  allowedExtensions: {'csv'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _csvToExcel = ToolExecutorConfig(
  endpoint: '/tools/document/csv-to-excel',
  allowedExtensions: {'csv'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _jsonToCsv = ToolExecutorConfig(
  endpoint: '/tools/document/json-to-csv',
  allowedExtensions: {'json'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Input must be an array of objects. Max 50,000 rows / 100 columns.',
);

const _markdownToHtml = ToolExecutorConfig(
  endpoint: '/tools/document/markdown-to-html',
  allowedExtensions: {'md', 'markdown'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Max 500,000 chars. Scripts and event handlers are stripped.',
);

const _documentMetadata = ToolExecutorConfig(
  endpoint: '/tools/document/metadata',
  allowedExtensions: _docxXlsx,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
);

const _documentCompress = ToolExecutorConfig(
  endpoint: '/tools/document/compress',
  allowedExtensions: _docxXlsx,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

// ---------------------------------------------------------------- File ---

const _textTypes = {'txt', 'md', 'csv', 'json'};

const _fileZipCreate = ToolExecutorConfig(
  endpoint: '/tools/file/zip-create',
  minFiles: 2,
  maxFiles: 20,
  maxCombinedSize: _mb50,
  resultType: ToolResultType.file,
  notice: 'Executable files are blocked. Combined maximum 50 MB.',
);

const _fileZipExtract = ToolExecutorConfig(
  endpoint: '/tools/file/zip-extract',
  allowedExtensions: {'zip'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.zipExtract,
  notice: 'Max 50 entries / 50 MB uncompressed.',
);

const _fileHash = ToolExecutorConfig(
  endpoint: '/tools/file/hash',
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
  notice: 'Bytes are not stored.',
);

const _fileType = ToolExecutorConfig(
  endpoint: '/tools/file/type',
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
  notice: 'Uses content sniffing, not the file extension.',
);

const _fileMetadata = ToolExecutorConfig(
  endpoint: '/tools/file/metadata',
  maxSizePerFile: _mb10,
  resultType: ToolResultType.json,
);

const _fileMerge = ToolExecutorConfig(
  endpoint: '/tools/file/merge',
  minFiles: 2,
  maxFiles: 20,
  allowedExtensions: _textTypes,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'All files must share one type (txt, md, csv or json).',
);

const _fileSplit = ToolExecutorConfig(
  endpoint: '/tools/file/split',
  allowedExtensions: _textTypes,
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Returns a ZIP of up to 20 line chunks.',
);

const _fileCompress = ToolExecutorConfig(
  endpoint: '/tools/file/compress',
  maxSizePerFile: _mb5,
  resultType: ToolResultType.file,
  notice: 'Maximum 5 MB. Returns gzip.',
);

const _fileBase64Encode = ToolExecutorConfig(
  endpoint: '/tools/file/base64-encode',
  maxSizePerFile: _mb5,
  resultType: ToolResultType.file,
  notice: 'Maximum 5 MB. Returns .b64.',
);

const _fileBase64Decode = ToolExecutorConfig(
  endpoint: '/tools/file/base64-decode',
  allowedExtensions: {'txt', 'b64', 'md', 'csv', 'json'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
);

const _fileRename = ToolExecutorConfig(
  endpoint: '/tools/file/rename',
  minFiles: 2,
  maxFiles: 20,
  resultType: ToolResultType.file,
  fields: [
    ToolField(
      name: 'pattern',
      label: 'Pattern (e.g. document-{i})',
      required: true,
      hint: 'Must contain {i}.',
    ),
  ],
  extraValidate: _requirePatternI,
  notice: 'Returns a ZIP. Executables are blocked.',
);

const _fileFolderToZip = ToolExecutorConfig(
  endpoint: '/tools/file/folder-to-zip',
  minFiles: 2,
  maxFiles: 20,
  resultType: ToolResultType.file,
  fields: [
    ToolField(
      name: 'paths',
      label: 'Paths JSON (relative path array)',
      required: true,
      hint: 'No ".." allowed.',
    ),
  ],
);

const _fileTarCreate = ToolExecutorConfig(
  endpoint: '/tools/file/tar-create',
  minFiles: 2,
  maxFiles: 20,
  maxCombinedSize: _mb50,
  resultType: ToolResultType.file,
  notice: 'Combined maximum 50 MB. Returns .tgz.',
);

const _fileTarExtract = ToolExecutorConfig(
  endpoint: '/tools/file/tar-extract',
  allowedExtensions: {'tar', 'tgz', 'gz'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Max 50 entries / 50 MB uncompressed. Returns ZIP.',
);

const _fileZipToTar = ToolExecutorConfig(
  endpoint: '/tools/file/zip-to-tar',
  allowedExtensions: {'zip'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Returns .tgz.',
);

const _fileTarToZip = ToolExecutorConfig(
  endpoint: '/tools/file/tar-to-zip',
  allowedExtensions: {'tar', 'tgz'},
  maxSizePerFile: _mb10,
  resultType: ToolResultType.file,
  notice: 'Returns ZIP.',
);

/// Explicit slug → config map. Keys are the natural catalogue slugs;
/// lookup is separator/case-insensitive, but endpoints ALWAYS come
/// from this table — never constructed from a slug.
abstract final class BackendToolConfigs {
  static const Map<String, ToolExecutorConfig> _configs = {
    // PDF (20)
    'pdf-merge': _pdfMerge,
    'pdf-split': _pdfSplit,
    'pdf-compress': _pdfCompress,
    'pdf-to-word': _pdfToWord,
    'pdf-from-image': _pdfFromImage,
    'pdf-rotate': _pdfRotate,
    'pdf-delete-pages': _pdfDeletePages,
    'pdf-watermark': _pdfWatermark,
    'pdf-number-pages': _pdfNumberPages,
    'pdf-header-footer': _pdfHeaderFooter,
    'pdf-reorder': _pdfReorder,
    'pdf-duplicate': _pdfDuplicate,
    'pdf-flatten': _pdfFlatten,
    'pdf-redact': _pdfRedact,
    'pdf-to-image': _pdfToImage,
    'pdf-sign': _pdfSign,
    'pdf-text': _pdfText,
    'pdf-metadata': _pdfMetadata,
    'pdf-search': _pdfSearch,
    'pdf-metadata-edit': _pdfMetadataEdit,
    // Image (19)
    'image-compress': _imageCompress,
    'image-convert': _imageConvert,
    'image-resize': _imageResize,
    'image-crop': _imageCrop,
    'image-rotate': _imageRotate,
    'image-flip': _imageFlip,
    'image-grayscale': _imageGrayscale,
    'image-blur': _imageBlur,
    'image-sharpen': _imageSharpen,
    'image-brightness': _imageBrightness,
    'image-contrast': _imageContrast,
    'image-pixelate': _imagePixelate,
    'image-watermark': _imageWatermark,
    'image-exif-remove': _imageExifRemove,
    'image-favicon': _imageFavicon,
    'image-social': _imageSocial,
    'image-passport': _imagePassport,
    'image-montage': _imageMontage,
    'image-metadata': _imageMetadata,
    // Document (13)
    'document-to-pdf': _documentToPdf,
    'word-to-txt': _wordToTxt,
    'word-to-html': _wordToHtml,
    'word-to-markdown': _wordToMarkdown,
    'txt-to-pdf': _txtToPdf,
    'excel-to-csv': _excelToCsv,
    'excel-to-json': _excelToJson,
    'csv-to-json': _csvToJson,
    'csv-to-excel': _csvToExcel,
    'json-to-csv': _jsonToCsv,
    'markdown-to-html': _markdownToHtml,
    'document-metadata': _documentMetadata,
    'document-compress': _documentCompress,
    // File (16)
    'file-zip-create': _fileZipCreate,
    'file-zip-extract': _fileZipExtract,
    'file-hash': _fileHash,
    'file-type': _fileType,
    'file-metadata': _fileMetadata,
    'file-merge': _fileMerge,
    'file-split': _fileSplit,
    'file-compress': _fileCompress,
    'file-base64-encode': _fileBase64Encode,
    'file-base64-decode': _fileBase64Decode,
    'file-rename': _fileRename,
    'file-folder-to-zip': _fileFolderToZip,
    'file-tar-create': _fileTarCreate,
    'file-tar-extract': _fileTarExtract,
    'file-zip-to-tar': _fileZipToTar,
    'file-tar-to-zip': _fileTarToZip,
    // Real catalogue aliases (verified against utilza_backend + web client).
    // Endpoints still come only from this table.
    'image-to-pdf': _pdfFromImage,
    'pdf-page-delete': _pdfDeletePages,
    'word-to-pdf': _documentToPdf,
    'zip-create': _fileZipCreate,
    'zip-extract': _fileZipExtract,
    'base64-encode': _fileBase64Encode,
    'base64-decode': _fileBase64Decode,
    'folder-to-zip': _fileFolderToZip,
    'tar-create': _fileTarCreate,
    'tar-extract': _fileTarExtract,
    'zip-to-tar': _fileZipToTar,
    'tar-to-zip': _fileTarToZip,
  };

  static String _normalize(String slug) =>
      slug.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');

  static ToolExecutorConfig? lookup(String slug) {
    final direct = _configs[slug.trim().toLowerCase()];
    if (direct != null) return direct;
    final want = _normalize(slug);
    for (final entry in _configs.entries) {
      if (_normalize(entry.key) == want) return entry.value;
    }
    return null;
  }

  static Set<String> get configuredSlugs => _configs.keys.toSet();
}

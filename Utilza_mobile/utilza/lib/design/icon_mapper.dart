// GENERATED from Utilza_webApp/design-system/tokens.json icon columns —
// keep in sync with design-system/ICON_MAP.md.
// Maps backend `icon` strings to Material IconData, with a per-category
// fallback (unknown key -> category icon -> Icons.build).
import 'package:flutter/material.dart';

/// Backend tool `icon` string -> Material icon.
const Map<String, IconData> kToolIcons = {
  'percent': Icons.percent,
  'tag': Icons.tag,
  'cake': Icons.cake,
  'calendar': Icons.calendar_month,
  'ruler': Icons.straighten,
  'type': Icons.text_fields,
  'text': Icons.format_align_left,
  'case': Icons.text_format,
  'key': Icons.key,
  'qr': Icons.qr_code,
  'merge': Icons.call_merge,
  'split': Icons.call_split,
  'compress': Icons.compress,
  'word': Icons.description,
  'convert': Icons.swap_horiz,
  'pdf': Icons.picture_as_pdf,
  'txt': Icons.text_snippet,
  'html': Icons.html,
  'markdown': Icons.article,
  'csv': Icons.table_chart,
  'json': Icons.data_object,
  'excel': Icons.grid_on,
  'info': Icons.info,
  'resize': Icons.aspect_ratio,
  'crop': Icons.crop,
  'rotate': Icons.rotate_right,
  'flip': Icons.flip,
  'zip': Icons.folder_zip,
  'unzip': Icons.unarchive,
  'hash': Icons.numbers,
  'code': Icons.code,
  'grayscale': Icons.contrast,
  'blur': Icons.blur_on,
  'sharpen': Icons.auto_fix_high,
  'brightness': Icons.brightness_6,
  'contrast': Icons.tune,
  'search': Icons.search,
  'pixelate': Icons.apps,
  'watermark': Icons.branding_watermark,
  'link': Icons.link,
  'dns': Icons.dns,
  'lock': Icons.lock,
  'redact': Icons.visibility_off,
  'social': Icons.share,
  'id': Icons.badge,
  'rename': Icons.drive_file_rename_outline,
  'archive': Icons.archive,
  'unarchive': Icons.outbox,
  'image': Icons.image,
  'sign': Icons.draw,
  'edit': Icons.edit,
  'privacy': Icons.privacy_tip,
  'star': Icons.star,
  'grid': Icons.grid_view,
  'trash': Icons.delete,
  'number': Icons.format_list_numbered,
  'header': Icons.title,
  'reorder': Icons.reorder,
  'copy': Icons.content_copy,
  'flatten': Icons.layers,
};

/// Category slug -> Material icon (also the per-category fallback).
const Map<String, IconData> kCategoryIcons = {
  'calculators': Icons.calculate,
  'date-time': Icons.schedule,
  'text': Icons.text_fields,
  'generators': Icons.auto_awesome,
  'pdf': Icons.picture_as_pdf,
  'image': Icons.image,
  'documents': Icons.folder_copy,
  'file': Icons.archive,
  'url': Icons.link,
};

/// Resolve a tool's icon: exact key first, then its category, then build.
IconData toolIconFor({String? iconKey, String? categorySlug}) {
  if (iconKey != null) {
    final exact = kToolIcons[iconKey];
    if (exact != null) return exact;
  }
  if (categorySlug != null) {
    final cat = kCategoryIcons[categorySlug];
    if (cat != null) return cat;
  }
  return Icons.build;
}

/// Resolve a category tile icon.
IconData categoryIconFor(String? slug) =>
    kCategoryIcons[slug] ?? Icons.build;

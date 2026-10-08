# Utilza Icon Naming Map

One tool → one icon on both platforms. Source: backend `icon` strings
(`Utilza_backend/src/modules/tools/tool-registry.ts`).
Web components use `src/features/catalog/components/tool-icons.js`;
Flutter uses the `IconData` column with `lib/design/app_tokens.dart` gradients.

Fallback rule (both platforms): unknown or missing key → the tool's
**category** icon. Unknown category → `Wrench` / `Icons.build`.

## Category icons

| Category slug | Web (lucide-react) | Flutter (Material) |
| --- | --- | --- |
| calculators | `Calculator` | `Icons.calculate` |
| date-time | `CalendarClock` | `Icons.schedule` |
| text | `Type` | `Icons.text_fields` |
| generators | `Sparkles` | `Icons.auto_awesome` |
| pdf | `FileText` | `Icons.picture_as_pdf` |
| image | `Image` | `Icons.image` |
| documents | `Files` | `Icons.folder_copy` |
| file | `Archive` | `Icons.archive` |
| url | `Link` | `Icons.link` |

## Tool icon keys

| Backend `icon` | Web (lucide-react) | Flutter (Material) |
| --- | --- | --- |
| percent | `Percent` | `Icons.percent` |
| tag | `Tag` | `Icons.tag` |
| cake | `Cake` | `Icons.cake` |
| calendar | `CalendarDays` | `Icons.calendar_month` |
| ruler | `Ruler` | `Icons.straighten` |
| type | `Type` | `Icons.text_fields` |
| text | `AlignLeft` | `Icons.format_align_left` |
| case | `CaseSensitive` | `Icons.text_format` |
| key | `KeyRound` | `Icons.key` |
| qr | `QrCode` | `Icons.qr_code` |
| merge | `Combine` | `Icons.call_merge` |
| split | `Split` | `Icons.call_split` |
| compress | `Shrink` | `Icons.compress` |
| word | `FileType` | `Icons.description` |
| convert | `ArrowLeftRight` | `Icons.swap_horiz` |
| pdf | `FileText` | `Icons.picture_as_pdf` |
| txt | `ScrollText` | `Icons.text_snippet` |
| html | `FileCode` | `Icons.html` |
| markdown | `FileCode2` | `Icons.article` |
| csv | `Table` | `Icons.table_chart` |
| json | `Braces` | `Icons.data_object` |
| excel | `Sheet` | `Icons.grid_on` |
| info | `Info` | `Icons.info` |
| resize | `Scaling` | `Icons.aspect_ratio` |
| crop | `Crop` | `Icons.crop` |
| rotate | `RotateCw` | `Icons.rotate_right` |
| flip | `FlipHorizontal2` | `Icons.flip` |
| zip | `FileArchive` | `Icons.folder_zip` |
| unzip | `PackageOpen` | `Icons.unarchive` |
| hash | `Hash` | `Icons.numbers` |
| code | `Code` | `Icons.code` |
| grayscale | `Contrast` | `Icons.contrast` |
| blur | `Droplets` | `Icons.blur_on` |
| sharpen | `Zap` | `Icons.auto_fix_high` |
| brightness | `Sun` | `Icons.brightness_6` |
| contrast | `SlidersHorizontal` | `Icons.tune` |
| search | `Search` | `Icons.search` |
| pixelate | `Boxes` | `Icons.apps` |
| watermark | `Stamp` | `Icons.branding_watermark` |
| link | `Link` | `Icons.link` |
| dns | `Globe` | `Icons.dns` |
| lock | `Lock` | `Icons.lock` |
| redact | `EyeOff` | `Icons.visibility_off` |
| social | `Share2` | `Icons.share` |
| id | `IdCard` | `Icons.badge` |
| rename | `PenLine` | `Icons.drive_file_rename_outline` |
| archive | `Archive` | `Icons.archive` |
| unarchive | `ArchiveRestore` | `Icons.outbox` |
| image | `Image` | `Icons.image` |
| sign | `PenTool` | `Icons.draw` |
| edit | `Pencil` | `Icons.edit` |
| privacy | `ShieldCheck` | `Icons.privacy_tip` |
| star | `Star` | `Icons.star` |
| grid | `LayoutDashboard` | `Icons.grid_view` |
| trash | `Trash2` | `Icons.delete` |
| number | `ListOrdered` | `Icons.format_list_numbered` |
| header | `Heading` | `Icons.title` |
| reorder | `ArrowUpDown` | `Icons.reorder` |
| copy | `Copy` | `Icons.content_copy` |
| flatten | `Layers` | `Icons.layers` |

All web names verified present in the installed `lucide-react@0.454`.
Flutter names use classic Material `Icons.*`; if a name is missing in an
older SDK, fall back to the category icon from the table above.

## Visual parity checklist (light + dark, web + Flutter)

- [ ] Same primary gradient, pressed edge and 5px→1px press travel on buttons.
- [ ] Same category gradients on IconTiles/CategoryTiles and card glows.
- [ ] Same icon per tool slug on both platforms (spot-check one per category).
- [ ] Same radii (card 20, tile 16, button 14, chip 999) and spacing steps.
- [ ] Same type scale (Inter; 32/700 display, 20/600 title, 16/400 body, 13/500 caption).
- [ ] Cards: inner top highlight + tight shadow + tinted glow in both themes.
- [ ] Dark mode is a dedicated palette on both sides (no inversion).
- [ ] Focus/ripple states visible; motion 150–250ms with 40ms stagger.

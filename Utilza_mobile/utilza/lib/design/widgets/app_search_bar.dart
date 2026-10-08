// Large rounded search bar with icon, clear button and submit action.
import 'package:flutter/material.dart';

import '../app_colors.dart';
import '../app_tokens.dart';

class AppSearchBar extends StatefulWidget {
  const AppSearchBar({
    super.key,
    this.controller,
    this.hintText = 'Search tools…',
    this.autofocus = false,
    this.onSubmitted,
    this.onChanged,
    this.semanticLabel = 'Search tools',
    this.readOnly = false,
    this.onTap,
  });

  final TextEditingController? controller;
  final String hintText;
  final bool autofocus;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final String semanticLabel;
  final bool readOnly;
  final VoidCallback? onTap;

  @override
  State<AppSearchBar> createState() => _AppSearchBarState();
}

class _AppSearchBarState extends State<AppSearchBar> {
  TextEditingController? _owned;
  TextEditingController get _controller =>
      widget.controller ?? (_owned ??= TextEditingController());

  @override
  void dispose() {
    _owned?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    return Semantics(
      textField: true,
      label: widget.semanticLabel,
      child: TextField(
        controller: _controller,
        autofocus: widget.autofocus,
        readOnly: widget.readOnly,
        onTap: widget.onTap,
        textInputAction: TextInputAction.search,
        onSubmitted: widget.onSubmitted,
        onChanged: (v) {
          setState(() {});
          widget.onChanged?.call(v);
        },
        decoration: InputDecoration(
          hintText: widget.hintText,
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _controller.text.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Clear search',
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _controller.clear();
                    setState(() {});
                    widget.onChanged?.call('');
                  },
                ),
          filled: true,
          fillColor: c.surface,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppShape.radiusChip),
            borderSide: BorderSide(color: c.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppShape.radiusChip),
            borderSide: BorderSide(color: c.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppShape.radiusChip),
            borderSide:
                const BorderSide(color: AppColors.primary, width: 2),
          ),
        ),
      ),
    );
  }
}

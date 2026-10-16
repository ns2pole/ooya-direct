import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'ui.dart';

class AddressSuggestField extends StatefulWidget {
  const AddressSuggestField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    required this.options,
    this.placeholder,
    this.enabled = true,
    this.loading = false,
  });

  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final List<String> options;
  final String? placeholder;
  final bool enabled;
  final bool loading;

  @override
  State<AddressSuggestField> createState() => _AddressSuggestFieldState();
}

class _AddressSuggestFieldState extends State<AddressSuggestField> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  final _link = LayerLink();
  OverlayEntry? _entry;
  int _highlight = 0;
  bool _open = false;
  int _overlayTries = 0;

  @override
  void initState() {
    super.initState();
    _controller.text = widget.value;
    _focus.addListener(_onFocus);
  }

  @override
  void didUpdateWidget(AddressSuggestField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
    if (_open) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _open) _syncOverlay();
      });
    }
  }

  @override
  void dispose() {
    _removeOverlay();
    _focus.removeListener(_onFocus);
    _focus.dispose();
    _controller.dispose();
    super.dispose();
  }

  List<String> get _filtered {
    final query = _controller.text.trim();
    if (query.isEmpty) return widget.options.take(100).toList();
    return widget.options.where((option) => option.contains(query)).toList();
  }

  void _onFocus() {
    if (_focus.hasFocus) {
      _openList();
      return;
    }
    Future<void>.delayed(Duration.zero, () {
      if (mounted && !_focus.hasFocus) _close();
    });
  }

  void _openList() {
    if (!widget.enabled || widget.loading) return;
    _open = true;
    _syncOverlay();
  }

  void _close() {
    _open = false;
    _removeOverlay();
  }

  void _choose(String option) {
    widget.onChanged(option);
    _controller.value = TextEditingValue(
      text: option,
      selection: TextSelection.collapsed(offset: option.length),
    );
    _close();
    _focus.unfocus();
  }

  void _syncOverlay() {
    _removeOverlay();
    if (!_open) return;
    final filtered = _filtered;
    if (filtered.isEmpty) return;
    final highlight = _highlight.clamp(0, filtered.length - 1);
    final field = _link.leaderSize ?? Size.zero;
    if (field.width == 0) {
      if (_overlayTries > 5) return;
      _overlayTries += 1;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _open) _syncOverlay();
      });
      return;
    }
    _overlayTries = 0;
    _entry = OverlayEntry(
      builder: (context) {
        return Positioned(
          width: field.width,
          child: CompositedTransformFollower(
            link: _link,
            showWhenUnlinked: false,
            offset: Offset(0, field.height + 3.2),
            child: Material(
              color: AppColors.surface,
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: AppColors.border),
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 240),
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  shrinkWrap: true,
                  children: [
                    for (var i = 0; i < filtered.length; i++)
                      Listener(
                        behavior: HitTestBehavior.opaque,
                        onPointerDown: (_) => _choose(filtered[i]),
                        child: Container(
                          color: i == highlight ? const Color(0xFFEEF2FF) : null,
                          padding: const EdgeInsets.symmetric(horizontal: 10.4, vertical: 6.4),
                          child: Text(filtered[i], style: appText(fontSize: 15.2)),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
    Overlay.of(context).insert(_entry!);
  }

  void _removeOverlay() {
    _entry?.remove();
    _entry = null;
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final filtered = _filtered;
    if (!_open &&
        (event.logicalKey == LogicalKeyboardKey.arrowDown || event.logicalKey == LogicalKeyboardKey.arrowUp)) {
      _openList();
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowDown && filtered.isNotEmpty) {
      setState(() => _highlight = (_highlight + 1).clamp(0, filtered.length - 1));
      _syncOverlay();
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowUp && filtered.isNotEmpty) {
      setState(() => _highlight = (_highlight - 1).clamp(0, filtered.length - 1));
      _syncOverlay();
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.enter && _open && filtered.isNotEmpty) {
      _choose(filtered[_highlight.clamp(0, filtered.length - 1)]);
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.escape) {
      _close();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: widget.label,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CompositedTransformTarget(
            link: _link,
            child: Focus(
              onKeyEvent: _onKey,
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                enabled: widget.enabled && !widget.loading,
                style: appText(),
                decoration: InputDecoration(hintText: widget.placeholder),
                onChanged: (value) {
                  _highlight = 0;
                  widget.onChanged(value);
                  _openList();
                },
              ),
            ),
          ),
          if (widget.loading) ...[
            const SizedBox(height: 4),
            const MutedText('読み込み中…', small: true),
          ],
        ],
      ),
    );
  }
}

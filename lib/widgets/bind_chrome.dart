import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../state/scope.dart';

class BindChrome extends StatefulWidget {
  const BindChrome({
    super.key,
    required this.child,
    this.crumbs = const [],
    this.endAction,
    this.listProgress,
  });

  final Widget child;
  final List<PageCrumb> crumbs;
  final PageEndAction? endAction;
  final ListProgress? listProgress;

  @override
  State<BindChrome> createState() => _BindChromeState();
}

class _BindChromeState extends State<BindChrome> {
  PageChrome? _chrome;
  int? _token;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final chrome = ChromeScope.of(context);
    if (!identical(_chrome, chrome)) {
      _chrome = chrome;
      _token = chrome.bind();
    }
    _schedule();
  }

  @override
  void didUpdateWidget(BindChrome oldWidget) {
    super.didUpdateWidget(oldWidget);
    _schedule();
  }

  void _schedule() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _chrome == null || _token == null) return;
      _chrome!.apply(
        _token!,
        crumbs: widget.crumbs,
        endAction: widget.endAction,
        listProgress: widget.listProgress,
      );
    });
  }

  @override
  void dispose() {
    _chrome?.release(_token);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

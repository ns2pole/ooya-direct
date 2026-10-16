import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';

/// Header matches the React form. The field layout is the next piece of the rewrite.
class FormCarryPage extends StatelessWidget {
  const FormCarryPage({super.key, required this.crumbs});

  final List<PageCrumb> crumbs;

  @override
  Widget build(BuildContext context) {
    return BindChrome(
      crumbs: crumbs,
      child: const Panel(
        child: Text('この入力画面は、今のフォームと同じ項目の並びに続けて移します。'),
      ),
    );
  }
}

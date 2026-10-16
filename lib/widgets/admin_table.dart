import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

Widget adminHead(String label) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 7.2, vertical: 9.6),
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
    child: Text(label, style: appText(fontSize: 13.6, fontWeight: FontWeight.w600, color: AppColors.muted)),
  );
}

Widget adminCell(Widget child) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 7.2, vertical: 9.6),
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
    child: child,
  );
}

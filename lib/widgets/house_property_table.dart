import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../logic/house.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

class HousePropertyTable extends StatelessWidget {
  const HousePropertyTable({super.key, required this.house});

  final House house;

  @override
  Widget build(BuildContext context) {
    final rows = housePropertyDetailRows(house);
    if (rows.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14.4, vertical: 10.4),
              decoration: BoxDecoration(
                border: i == rows.length - 1
                    ? null
                    : const Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 112,
                    child: Text(rows[i].label, style: appText(fontSize: 15.2, fontWeight: FontWeight.w500, color: AppColors.muted)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: _Value(row: rows[i])),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Value extends StatelessWidget {
  const _Value({required this.row});

  final DetailRow row;

  @override
  Widget build(BuildContext context) {
    final href = row.href;
    if (href == null) {
      return Text(row.value, style: appText(fontSize: 15.2));
    }
    return GestureDetector(
      onTap: () => _open(href),
      child: Text(
        row.value,
        style: appText(
          fontSize: 15.2,
          color: AppColors.primary,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }

  Future<void> _open(String href) async {
    final uri = Uri.tryParse(href);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class AppLink extends StatelessWidget {
  const AppLink({super.key, required this.label, required this.to, this.underline = false});

  final String label;
  final String to;
  final bool underline;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(to),
      child: Text(
        label,
        style: appText(
          color: AppColors.primary,
          decoration: underline ? TextDecoration.underline : TextDecoration.none,
        ),
      ),
    );
  }
}

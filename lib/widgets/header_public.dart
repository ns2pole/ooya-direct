import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../logic/house.dart';
import '../state/app_state.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'ui.dart';

class LoggedOutBar extends StatelessWidget {
  const LoggedOutBar({
    super.key,
    required this.brand,
    required this.showBack,
    required this.houseId,
    required this.chrome,
  });

  final String brand;
  final bool showBack;
  final String? houseId;
  final PageChrome chrome;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13.6),
      child: Row(
        children: [
          Expanded(
            child: Align(
              alignment: Alignment.centerLeft,
              child: showBack ? HeaderBackButton(houseId: houseId) : const SizedBox.shrink(),
            ),
          ),
          HeaderBrand(label: brand),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: HeaderEnd(chrome: chrome, placeholder: true),
            ),
          ),
        ],
      ),
    );
  }
}

class HeaderBrand extends StatelessWidget {
  const HeaderBrand({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/'),
      child: Text(label, style: appText(fontSize: 16.8, fontWeight: FontWeight.w700)),
    );
  }
}

class HeaderBackButton extends StatelessWidget {
  const HeaderBackButton({super.key, required this.houseId});

  final String? houseId;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(houseId == null ? '/' : homePathForHouse(houseId!)),
      child: Text('← 戻る', style: appText(fontSize: 15.2, fontWeight: FontWeight.w600, color: AppColors.primary)),
    );
  }
}

class HeaderEnd extends StatelessWidget {
  const HeaderEnd({super.key, required this.chrome, required this.placeholder});

  final PageChrome chrome;
  final bool placeholder;

  @override
  Widget build(BuildContext context) {
    final action = chrome.endAction;
    if (action != null) {
      return AppButton(label: action.label, onPressed: action.onPressed, primary: true, compact: true);
    }
    if (chrome.crumbs.isNotEmpty) {
      return HeaderCrumbs(crumbs: chrome.crumbs);
    }
    final progress = chrome.listProgress;
    if (progress != null && progress.listedDate.isNotEmpty) {
      return Text(
        '掲載: ${progress.listedDate}',
        style: appText(fontSize: 12.8, fontWeight: FontWeight.w500, color: AppColors.muted),
      );
    }
    if (!placeholder) return const SizedBox.shrink();
    return const SizedBox(width: 8);
  }
}

class HeaderCrumbs extends StatelessWidget {
  const HeaderCrumbs({super.key, required this.crumbs});

  final List<PageCrumb> crumbs;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < crumbs.length; i++) ...[
          if (i > 0)
            Text(' / ', style: appText(fontSize: 16.8, fontWeight: FontWeight.w400, color: AppColors.muted)),
          HeaderCrumbText(crumb: crumbs[i]),
        ],
      ],
    );
  }
}

class HeaderCrumbText extends StatelessWidget {
  const HeaderCrumbText({super.key, required this.crumb});

  final PageCrumb crumb;

  @override
  Widget build(BuildContext context) {
    final style = appText(
      fontSize: 16.8,
      fontWeight: FontWeight.w600,
      color: crumb.to == null ? AppColors.text : AppColors.primary,
      decoration: crumb.to == null ? TextDecoration.none : TextDecoration.underline,
    );
    final text = Text(crumb.label, style: style, overflow: TextOverflow.ellipsis);
    if (crumb.to == null) return text;
    return GestureDetector(onTap: () => context.go(crumb.to!), child: text);
  }
}

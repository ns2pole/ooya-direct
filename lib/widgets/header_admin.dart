import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../state/app_state.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'header_public.dart';
import 'ui.dart';

class LoggedInBar extends StatelessWidget {
  const LoggedInBar({
    super.key,
    required this.brand,
    required this.showBack,
    required this.houseId,
    required this.chrome,
    required this.path,
    required this.onSync,
    required this.onLogout,
  });

  final String brand;
  final bool showBack;
  final String? houseId;
  final PageChrome chrome;
  final String path;
  final Future<void> Function() onSync;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 53.6,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: BoxConstraints(minWidth: constraints.maxWidth, minHeight: 53.6),
              child: Padding(
                padding: const EdgeInsets.only(left: 12, right: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (showBack) ...[
                          HeaderBackButton(houseId: houseId),
                          const SizedBox(width: 8),
                        ],
                        HeaderBrand(label: brand),
                        const SizedBox(width: 8),
                        SyncButton(onSync: onSync),
                      ],
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        HeaderEnd(chrome: chrome, placeholder: false),
                        const SizedBox(width: 10.4),
                        AdminNav(path: path, onLogout: onLogout),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class SyncButton extends StatefulWidget {
  const SyncButton({super.key, required this.onSync});

  final Future<void> Function() onSync;

  @override
  State<SyncButton> createState() => _SyncButtonState();
}

class _SyncButtonState extends State<SyncButton> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    return AppButton(
      label: _busy ? '同期中…' : '同期',
      primary: true,
      onPressed: _busy
          ? null
          : () async {
              setState(() => _busy = true);
              try {
                await widget.onSync();
              } finally {
                if (mounted) setState(() => _busy = false);
              }
            },
      icon: Icon(Icons.sync, size: 16.8, color: _busy ? Colors.white70 : Colors.white),
    );
  }
}

class AdminNav extends StatelessWidget {
  const AdminNav({super.key, required this.path, required this.onLogout});

  final String path;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AdminNavLink(label: '物件', icon: Icons.home_outlined, to: '/landlord/houses', active: path.startsWith('/landlord/houses')),
        AdminNavLink(label: '大家', icon: Icons.person_outline, to: '/landlord/landlords', active: path.startsWith('/landlord/landlords')),
        AdminNavLink(
          label: 'LINE通知',
          iconWidget: const LineMark(),
          to: '/landlord/line',
          active: path.startsWith('/landlord/line'),
        ),
        AdminNavLink(label: 'ログアウト', icon: Icons.logout, onTap: onLogout),
      ],
    );
  }
}

class LineMark extends StatelessWidget {
  const LineMark({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 18.4,
      height: 18.4,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: AppColors.lineGreen, borderRadius: BorderRadius.circular(5)),
      child: Text('L', style: appText(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white, height: 1)),
    );
  }
}

class AdminNavLink extends StatelessWidget {
  const AdminNavLink({
    super.key,
    required this.label,
    this.icon,
    this.iconWidget,
    this.to,
    this.onTap,
    this.active = false,
  });

  final String label;
  final IconData? icon;
  final Widget? iconWidget;
  final String? to;
  final VoidCallback? onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap ?? (to == null ? null : () => context.go(to!)),
        hoverColor: const Color.fromRGBO(37, 99, 235, 0.06),
        child: Container(
          height: 53.6,
          padding: const EdgeInsets.symmetric(horizontal: 13.6),
          decoration: BoxDecoration(
            border: Border(
              left: const BorderSide(color: AppColors.border),
              bottom: BorderSide(color: active ? AppColors.primary : Colors.transparent, width: 3),
            ),
          ),
          child: Row(
            children: [
              iconWidget ?? Icon(icon, size: 18.4, color: AppColors.primary),
              const SizedBox(width: 6.4),
              Text(label, style: appText(fontSize: 14.72, fontWeight: FontWeight.w700, color: AppColors.adminNav, height: 1.2)),
            ],
          ),
        ),
      ),
    );
  }
}

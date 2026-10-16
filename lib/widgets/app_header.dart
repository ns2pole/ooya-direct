import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'ui.dart';

class AppHeader extends StatelessWidget {
  const AppHeader({super.key, required this.path});

  final String path;

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final chrome = ChromeScope.of(context);
    final toast = ToastScope.of(context);
    final refresh = RefreshScope.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([auth, chrome]),
      builder: (context, _) {
        final houseId = _houseId(path);
        final brand = chrome.listProgress == null
            ? '大家ダイレクト'
            : '大家ダイレクト(${chrome.listProgress!.current}/${chrome.listProgress!.total})';
        return Material(
          color: AppColors.surface,
          child: DecoratedBox(
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: SafeArea(
              bottom: false,
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 880),
                  child: auth.user == null
                      ? _LoggedOutBar(
                          brand: brand,
                          showBack: houseId != null,
                          houseId: houseId,
                          chrome: chrome,
                        )
                      : _LoggedInBar(
                          brand: brand,
                          showBack: houseId != null,
                          houseId: houseId,
                          chrome: chrome,
                          path: path,
                          onSync: () => _sync(context, toast, refresh),
                          onLogout: () async {
                            final ok = await askConfirm(context, 'ログアウトしますか？');
                            if (ok && context.mounted) {
                              await auth.signOut();
                              if (context.mounted) context.go('/');
                            }
                          },
                        ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  String? _houseId(String path) {
    final match = RegExp(r'^/houses/([^/]+)$').firstMatch(path);
    return match?.group(1);
  }

  Future<void> _sync(BuildContext context, ToastController toast, AdminRefresh refresh) async {
    try {
      final summary = await AdminRepository().syncNow();
      toast.show('同期しました。${summary.label}', ToastKind.success);
      refresh.bump();
    } catch (error) {
      toast.show(firebaseErrorText(error, fallback: '同期に失敗しました。'), ToastKind.error);
    }
  }
}

class _LoggedOutBar extends StatelessWidget {
  const _LoggedOutBar({
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
              child: showBack ? _BackButton(houseId: houseId) : const SizedBox.shrink(),
            ),
          ),
          _Brand(label: brand),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: _HeaderEnd(chrome: chrome, placeholder: true),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoggedInBar extends StatelessWidget {
  const _LoggedInBar({
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
                          _BackButton(houseId: houseId),
                          const SizedBox(width: 8),
                        ],
                        _Brand(label: brand),
                        const SizedBox(width: 8),
                        _SyncButton(onSync: onSync),
                      ],
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _HeaderEnd(chrome: chrome, placeholder: false),
                        const SizedBox(width: 10.4),
                        _AdminNav(path: path, onLogout: onLogout),
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

class _Brand extends StatelessWidget {
  const _Brand({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/'),
      child: Text(label, style: appText(fontSize: 16.8, fontWeight: FontWeight.w700)),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.houseId});

  final String? houseId;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(houseId == null ? '/' : homePathForHouse(houseId!)),
      child: Text('← 戻る', style: appText(fontSize: 15.2, fontWeight: FontWeight.w600, color: AppColors.primary)),
    );
  }
}

class _HeaderEnd extends StatelessWidget {
  const _HeaderEnd({required this.chrome, required this.placeholder});

  final PageChrome chrome;
  final bool placeholder;

  @override
  Widget build(BuildContext context) {
    final action = chrome.endAction;
    if (action != null) {
      return AppButton(label: action.label, onPressed: action.onPressed, primary: true, compact: true);
    }
    if (chrome.crumbs.isNotEmpty) {
      return _Crumbs(crumbs: chrome.crumbs);
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

class _Crumbs extends StatelessWidget {
  const _Crumbs({required this.crumbs});

  final List<PageCrumb> crumbs;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < crumbs.length; i++) ...[
          if (i > 0)
            Text(' / ', style: appText(fontSize: 16.8, fontWeight: FontWeight.w400, color: AppColors.muted)),
          _CrumbText(crumb: crumbs[i]),
        ],
      ],
    );
  }
}

class _CrumbText extends StatelessWidget {
  const _CrumbText({required this.crumb});

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

class _SyncButton extends StatefulWidget {
  const _SyncButton({required this.onSync});

  final Future<void> Function() onSync;

  @override
  State<_SyncButton> createState() => _SyncButtonState();
}

class _SyncButtonState extends State<_SyncButton> {
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

class _AdminNav extends StatelessWidget {
  const _AdminNav({required this.path, required this.onLogout});

  final String path;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _NavLink(label: '物件', icon: Icons.home_outlined, to: '/landlord/houses', active: path.startsWith('/landlord/houses')),
        _NavLink(label: '大家', icon: Icons.person_outline, to: '/landlord/landlords', active: path.startsWith('/landlord/landlords')),
        _NavLink(label: 'LINE通知', iconWidget: const _LineMark(), to: '/landlord/line', active: path.startsWith('/landlord/line')),
        _NavLink(label: 'ログアウト', icon: Icons.logout, onTap: onLogout),
      ],
    );
  }
}

class _LineMark extends StatelessWidget {
  const _LineMark();

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

class _NavLink extends StatelessWidget {
  const _NavLink({
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

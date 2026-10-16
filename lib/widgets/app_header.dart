import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_colors.dart';
import 'header_admin.dart';
import 'header_public.dart';
import 'ui.dart';

class AppHeader extends StatelessWidget {
  const AppHeader({super.key, required this.path});

  final String path;

  String? _houseId(String path) {
    final match = RegExp(r'^/houses/([^/]+)$').firstMatch(path);
    return match?.group(1);
  }

  Future<void> _sync(BuildContext context) async {
    final toast = ToastScope.of(context);
    final refresh = RefreshScope.of(context);
    try {
      final summary = await AdminRepository().syncNow();
      toast.show('同期しました。${summary.label}', ToastKind.success);
      refresh.bump();
    } catch (error) {
      toast.show(firebaseErrorText(error, fallback: '同期に失敗しました。'), ToastKind.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final chrome = ChromeScope.of(context);
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
                  ? LoggedOutBar(
                      brand: brand,
                      showBack: houseId != null,
                      houseId: houseId,
                      chrome: chrome,
                    )
                  : LoggedInBar(
                      brand: brand,
                      showBack: houseId != null,
                      houseId: houseId,
                      chrome: chrome,
                      path: path,
                      onSync: () => _sync(context),
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
  }
}

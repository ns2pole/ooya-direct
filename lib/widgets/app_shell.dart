import 'package:flutter/material.dart';

import '../firebase/firebase_env.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_header.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.path, required this.child});

  final String path;
  final Widget child;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _scroll = ScrollController();

  @override
  void didUpdateWidget(AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.path != widget.path) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.jumpTo(0);
      });
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final toast = ToastScope.of(context);
    final narrow = MediaQuery.sizeOf(context).width <= 640;
    return ListenableBuilder(
      listenable: toast,
      builder: (context, _) {
        return ColoredBox(
          color: AppColors.bg,
          child: Stack(
            children: [
              Column(
                children: [
                  AppHeader(path: widget.path),
                  if (!FirebaseEnv.isConfigured) const _FirebaseBanner(),
                  Expanded(
                    child: Scrollbar(
                      controller: _scroll,
                      child: SingleChildScrollView(
                        controller: _scroll,
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 880),
                            child: Padding(
                              padding: EdgeInsets.only(top: narrow ? 12 : 24, bottom: narrow ? 24 : 48),
                              child: widget.child,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (toast.current != null)
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 20,
                  child: Center(child: _ToastView(message: toast.current!)),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _FirebaseBanner extends StatelessWidget {
  const _FirebaseBanner();

  @override
  Widget build(BuildContext context) {
    final keys = FirebaseEnv.missingKeys.join(', ');
    final detail = isLocalBuild
        ? 'firebase_defines.json に Firebase の値を入れて、アプリを再起動してください。空のままなのは次のキーです: ${keys.isEmpty ? '（判定中）' : keys}。'
        : 'GitHub Actions の dart-define に FIREBASE_* を追加して、もう一度ビルドしてください。不足キー: ${keys.isEmpty ? '（判定中）' : keys}。';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.bannerBg,
        border: Border(bottom: BorderSide(color: AppColors.bannerBorder)),
      ),
      child: Text.rich(
        TextSpan(
          style: appText(color: AppColors.bannerText),
          children: [
            TextSpan(text: 'Firebase の環境変数が足りません。 ', style: appText(color: AppColors.bannerText, fontWeight: FontWeight.w700)),
            TextSpan(text: detail),
          ],
        ),
      ),
    );
  }
}

class _ToastView extends StatelessWidget {
  const _ToastView({required this.message});

  final ToastMessage message;

  @override
  Widget build(BuildContext context) {
    final error = message.kind == ToastKind.error;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: error ? AppColors.danger : AppColors.success,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: error ? const Color(0xFF991B1B) : const Color(0xFF166534)),
          boxShadow: const [BoxShadow(color: Color.fromRGBO(16, 24, 40, 0.18), blurRadius: 24, offset: Offset(0, 4))],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 12),
          child: Text(
            message.text,
            textAlign: TextAlign.center,
            style: appText(fontSize: 15.2, color: Colors.white, height: 1.45),
          ),
        ),
      ),
    );
  }
}

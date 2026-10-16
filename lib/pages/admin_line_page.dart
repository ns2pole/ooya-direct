import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../state/scope.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';

const lineAddFriendUrl = 'https://lin.ee/uvetvHd';

class AdminLinePage extends StatefulWidget {
  const AdminLinePage({super.key});

  @override
  State<AdminLinePage> createState() => _AdminLinePageState();
}

class _AdminLinePageState extends State<AdminLinePage> {
  final _repo = AdminRepository();
  StreamSubscription<({String? lineUserId, DateTime? linkedAt})>? _sub;
  bool _loading = true;
  bool _linked = false;
  DateTime? _linkedAt;
  String? _code;
  String? _error;
  bool _linking = false;
  bool _unlinking = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_sub != null) return;
    final user = AuthScope.of(context).user;
    if (!FirebaseEnv.isConfigured || user == null) {
      _loading = false;
      return;
    }
    _sub = _repo.lineProfile(user.uid).listen(
      (profile) {
        if (!mounted) return;
        setState(() {
          _linked = profile.lineUserId != null;
          _linkedAt = profile.linkedAt;
          _loading = false;
        });
      },
      onError: (_) {
        if (!mounted) return;
        setState(() => _loading = false);
      },
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _linking = true;
      _error = null;
    });
    try {
      final code = await _repo.startLineLink();
      if (!mounted) return;
      setState(() => _code = code);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = firebaseErrorText(error, fallback: '処理に失敗しました。'));
    } finally {
      if (mounted) setState(() => _linking = false);
    }
  }

  Future<void> _unlink() async {
    final ok = await askConfirm(context, 'LINE 通知の連携を解除しますか？');
    if (!ok) return;
    setState(() {
      _unlinking = true;
      _error = null;
    });
    try {
      await _repo.unlinkLine();
      if (!mounted) return;
      setState(() => _code = null);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = firebaseErrorText(error, fallback: '処理に失敗しました。'));
    } finally {
      if (mounted) setState(() => _unlinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BindChrome(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFAFBFE),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E6EF)),
        ),
        child: VStack(
          children: [
            Text('LINE 通知', style: appText(fontSize: 16, fontWeight: FontWeight.w600, height: 1.3)),
            if (_loading)
              const MutedText('LINE 連携状態を確認中…', small: true)
            else if (_linked)
              VStack(
                children: [
                  const SuccessText('LINE 通知: 連携済み'),
                  if (_linkedAt != null) MutedText('連携日: ${formatDateOnly(_linkedAt)}', small: true),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: AppButton(
                      label: _unlinking ? '解除中…' : '連携を解除',
                      ghost: true,
                      onPressed: _unlinking ? null : _unlink,
                    ),
                  ),
                ],
              )
            else
              VStack(
                children: [
                  const MutedText('問い合わせが届いたときに LINE で通知を受け取れます。', small: true),
                  Padding(
                    padding: const EdgeInsets.only(left: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _step(
                          GestureDetector(
                            onTap: () => launchUrl(Uri.parse(lineAddFriendUrl), mode: LaunchMode.externalApplication),
                            child: Text(
                              'LINE 公式アカウントを友だち追加',
                              style: appText(fontSize: 14, color: AppColors.primary, decoration: TextDecoration.underline),
                            ),
                          ),
                        ),
                        _step(Text('下のボタンで連携コードを発行（10分間有効）', style: appText(fontSize: 14, color: AppColors.muted))),
                        _step(Text('LINE のトークに6桁のコードを送信', style: appText(fontSize: 14, color: AppColors.muted))),
                      ],
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: AppButton(
                      label: _linking ? '発行中…' : '連携コードを発行',
                      primary: true,
                      onPressed: _linking ? null : _start,
                    ),
                  ),
                  if (_code != null)
                    Text.rich(
                      TextSpan(
                        style: appText(),
                        children: [
                          const TextSpan(text: '連携コード: '),
                          TextSpan(
                            text: _code,
                            style: appText(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: 2.4),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            if (_error != null) ErrorText(_error!),
          ],
        ),
      ),
    );
  }

  Widget _step(Widget child) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: appText(fontSize: 14, color: AppColors.muted)),
          Expanded(child: child),
        ],
      ),
    );
  }
}

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../state/scope.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _submitting = true;
    });
    try {
      await AuthScope.of(context).signIn(_email.text, _password.text);
    } on FirebaseAuthException catch (error) {
      setState(() => _error = messageForAuthCode(error.code));
    } catch (_) {
      setState(() => _error = 'ログインに失敗しました。');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    return BindChrome(
      child: ListenableBuilder(
        listenable: auth,
        builder: (context, _) {
          if (!FirebaseEnv.isConfigured) {
            return const Panel(child: Text('Firebase を設定するとログインできます。'));
          }
          if (auth.loading) return const Panel(child: Text('認証状態を確認中…'));
          return Panel(
            child: VStack(
              children: [
                const Text('ログイン ID とパスワードで、物件と大家を登録できます。'),
                LabeledField(
                  label: 'ログイン ID（メールアドレス）',
                  child: TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.username],
                    decoration: const InputDecoration(),
                  ),
                ),
                LabeledField(
                  label: 'パスワード',
                  child: TextField(
                    controller: _password,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    decoration: const InputDecoration(),
                    onSubmitted: (_) => _submit(),
                  ),
                ),
                if (_error != null) ErrorText(_error!),
                Align(
                  alignment: Alignment.centerLeft,
                  child: AppButton(
                    label: _submitting ? 'ログイン中…' : 'ログイン',
                    primary: true,
                    onPressed: _submitting ? null : _submit,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

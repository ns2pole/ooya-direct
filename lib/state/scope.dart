import 'package:flutter/widgets.dart';

import 'app_state.dart';

class ChromeScope extends InheritedNotifier<PageChrome> {
  const ChromeScope({super.key, required PageChrome chrome, required super.child}) : super(notifier: chrome);

  static PageChrome of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ChromeScope>();
    assert(scope != null, 'ChromeScope がありません');
    return scope!.notifier!;
  }
}

class AuthScope extends InheritedNotifier<AuthController> {
  const AuthScope({super.key, required AuthController auth, required super.child}) : super(notifier: auth);

  static AuthController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope がありません');
    return scope!.notifier!;
  }
}

class ToastScope extends InheritedNotifier<ToastController> {
  const ToastScope({super.key, required ToastController toast, required super.child}) : super(notifier: toast);

  static ToastController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ToastScope>();
    assert(scope != null, 'ToastScope がありません');
    return scope!.notifier!;
  }
}

class RefreshScope extends InheritedNotifier<AdminRefresh> {
  const RefreshScope({super.key, required AdminRefresh refresh, required super.child}) : super(notifier: refresh);

  static AdminRefresh of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<RefreshScope>();
    assert(scope != null, 'RefreshScope がありません');
    return scope!.notifier!;
  }
}

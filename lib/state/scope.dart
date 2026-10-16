import 'package:flutter/widgets.dart';

import 'app_state.dart';

class ChromeScope extends InheritedWidget {
  const ChromeScope({super.key, required this.chrome, required super.child});

  final PageChrome chrome;

  static PageChrome of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ChromeScope>();
    assert(scope != null, 'ChromeScope がありません');
    return scope!.chrome;
  }

  @override
  bool updateShouldNotify(ChromeScope oldWidget) => chrome != oldWidget.chrome;
}

class AuthScope extends InheritedWidget {
  const AuthScope({super.key, required this.auth, required super.child});

  final AuthController auth;

  static AuthController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope がありません');
    return scope!.auth;
  }

  @override
  bool updateShouldNotify(AuthScope oldWidget) => auth != oldWidget.auth;
}

class ToastScope extends InheritedWidget {
  const ToastScope({super.key, required this.toast, required super.child});

  final ToastController toast;

  static ToastController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ToastScope>();
    assert(scope != null, 'ToastScope がありません');
    return scope!.toast;
  }

  @override
  bool updateShouldNotify(ToastScope oldWidget) => toast != oldWidget.toast;
}

class RefreshScope extends InheritedWidget {
  const RefreshScope({super.key, required this.refresh, required super.child});

  final AdminRefresh refresh;

  static AdminRefresh of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<RefreshScope>();
    assert(scope != null, 'RefreshScope がありません');
    return scope!.refresh;
  }

  @override
  bool updateShouldNotify(RefreshScope oldWidget) => refresh != oldWidget.refresh;
}

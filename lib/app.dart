import 'package:flutter/material.dart';

import 'router/app_router.dart';
import 'state/app_state.dart';
import 'state/scope.dart';
import 'theme/app_theme.dart';

class OoyaApp extends StatefulWidget {
  const OoyaApp({super.key});

  @override
  State<OoyaApp> createState() => _OoyaAppState();
}

class _OoyaAppState extends State<OoyaApp> {
  late final AuthController _auth;
  late final PageChrome _chrome;
  late final ToastController _toast;
  late final AdminRefresh _refresh;
  late final router = createRouter(_auth);

  @override
  void initState() {
    super.initState();
    _auth = AuthController();
    _chrome = PageChrome();
    _toast = ToastController();
    _refresh = AdminRefresh();
  }

  @override
  void dispose() {
    _auth.dispose();
    _chrome.dispose();
    _toast.dispose();
    _refresh.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScope(
      auth: _auth,
      child: ChromeScope(
        chrome: _chrome,
        child: ToastScope(
          toast: _toast,
          child: RefreshScope(
            refresh: _refresh,
            child: MaterialApp.router(
              title: '大家ダイレクト',
              debugShowCheckedModeBanner: false,
              theme: buildAppTheme(),
              routerConfig: router,
            ),
          ),
        ),
      ),
    );
  }
}

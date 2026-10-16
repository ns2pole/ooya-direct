import 'package:flutter/widgets.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../state/scope.dart';

class AdminCatalogSnapshot {
  AdminCatalogSnapshot({
    required this.repo,
    required this._current,
    required this.loading,
    required this.error,
    required this.replace,
  });

  final AdminRepository repo;
  final AdminCatalog? Function() _current;
  final bool loading;
  final String? error;
  final void Function(AdminCatalog catalog) replace;

  AdminCatalog? get catalog => _current();
}

class AdminCatalogHost extends StatefulWidget {
  const AdminCatalogHost({super.key, required this.builder});

  final Widget Function(BuildContext context, AdminCatalogSnapshot snapshot) builder;

  @override
  State<AdminCatalogHost> createState() => _AdminCatalogHostState();
}

class _AdminCatalogHostState extends State<AdminCatalogHost> {
  final _repo = AdminRepository();
  AdminCatalog? _catalog;
  bool _loading = true;
  String? _error;
  String? _loadedFor;
  int? _seenRefresh;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = AuthScope.of(context);
    final refresh = RefreshScope.of(context);
    if (auth.loading) return;
    final uid = auth.user?.uid;
    if (_loadedFor == uid && _seenRefresh == refresh.version) return;
    _loadedFor = uid;
    _seenRefresh = refresh.version;
    _reload();
  }

  Future<void> _reload() async {
    final user = AuthScope.of(context).user;
    if (user == null) return;
    setState(() {
      _loading = _catalog == null;
      _error = null;
    });
    try {
      final catalog = await _repo.load(user.uid);
      if (!mounted) return;
      setState(() {
        _catalog = catalog;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = firebaseErrorText(error, fallback: '一覧の取得に失敗しました。');
        _loading = false;
      });
    }
  }

  void _replace(AdminCatalog catalog) {
    setState(() => _catalog = catalog);
  }

  @override
  Widget build(BuildContext context) {
    return widget.builder(
      context,
      AdminCatalogSnapshot(
        repo: _repo,
        current: () => _catalog,
        loading: _loading,
        error: _error,
        replace: _replace,
      ),
    );
  }
}

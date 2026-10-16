import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_text.dart';
import '../widgets/admin_table.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';

class AdminLandlordsPage extends StatefulWidget {
  const AdminLandlordsPage({super.key});

  @override
  State<AdminLandlordsPage> createState() => _AdminLandlordsPageState();
}

class _AdminLandlordsPageState extends State<AdminLandlordsPage> {
  final _repo = AdminRepository();
  AdminCatalog? _catalog;
  bool _loading = true;
  String? _error;
  AdminRefresh? _refresh;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final refresh = RefreshScope.of(context);
    if (!identical(_refresh, refresh)) {
      _refresh?.removeListener(_reload);
      _refresh = refresh;
      refresh.addListener(_reload);
      _reload();
    }
  }

  @override
  void dispose() {
    _refresh?.removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final user = AuthScope.of(context).user;
    if (user == null) return;
    try {
      final catalog = await _repo.load(user.uid);
      if (!mounted) return;
      setState(() {
        _catalog = catalog;
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = firebaseErrorText(error, fallback: '一覧の取得に失敗しました。');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const BindChrome(child: Panel(child: Text('読み込み中…')));
    final catalog = _catalog;
    return BindChrome(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[ErrorText(_error!), const SizedBox(height: 12)],
          Panel(
            child: VStack(
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: AppButton(label: '新規登録', primary: true, onPressed: () => context.go('/landlord/landlords/new')),
                ),
                if (catalog == null || catalog.landlords.isEmpty)
                  const MutedText('まだ大家がいません。')
                else
                  _table(context, catalog),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _table(BuildContext context, AdminCatalog catalog) {
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(1.2),
        1: FlexColumnWidth(2.4),
        2: FlexColumnWidth(0.8),
      },
      children: [
        TableRow(children: [adminHead('名前'), adminHead('URL'), adminHead('操作')]),
        for (final landlord in catalog.landlords)
          TableRow(
            children: [
              adminCell(Text(landlord.name, style: appText())),
              adminCell(
                Text(
                  _urls(catalog, landlord.id).isEmpty ? 'なし' : _urls(catalog, landlord.id).join('、'),
                  style: appText(),
                ),
              ),
              adminCell(
                AppButton(
                  label: '編集',
                  ghost: true,
                  onPressed: () => context.go('/landlord/landlords/${landlord.id}'),
                ),
              ),
            ],
          ),
      ],
    );
  }

  List<String> _urls(AdminCatalog catalog, String landlordId) {
    return catalog.sources.where((source) => source.landlordId == landlordId).map((source) => source.url).toList();
  }
}

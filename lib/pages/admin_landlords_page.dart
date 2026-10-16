import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/admin_repository.dart';
import '../theme/app_text.dart';
import '../widgets/admin_table.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';
import 'admin_catalog.dart';

class AdminLandlordsPage extends StatelessWidget {
  const AdminLandlordsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AdminCatalogHost(
      builder: (context, snapshot) {
        if (snapshot.loading) return const BindChrome(child: Panel(child: Text('読み込み中…')));
        return _body(context, snapshot);
      },
    );
  }

  Widget _body(BuildContext context, AdminCatalogSnapshot snapshot) {
    final catalog = snapshot.catalog;
    return BindChrome(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (snapshot.error != null) ...[ErrorText(snapshot.error!), const SizedBox(height: 12)],
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

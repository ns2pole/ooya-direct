import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../logic/portal_label.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import '../widgets/admin_table.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';
import 'admin_catalog.dart';

class AdminHousesPage extends StatelessWidget {
  const AdminHousesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AdminCatalogHost(
      builder: (context, snapshot) {
        if (snapshot.loading) {
          return const BindChrome(child: Panel(child: Text('読み込み中…')));
        }
        final catalog = snapshot.catalog;
        final status = catalog?.status;
        final syncLabel = status?.lastSyncedAt == null
            ? null
            : '最終同期: ${formatDate(status!.lastSyncedAt)}（新規 ${status.created}件、更新 ${status.updated}件、変化なし ${status.unchanged}件、成約のため削除 ${status.removed}件）';
        return BindChrome(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (snapshot.error != null) ...[
                ErrorText(snapshot.error!),
                const SizedBox(height: 12),
              ],
              Panel(
                child: VStack(
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AppButton(label: '新規登録', primary: true, onPressed: () => context.go('/landlord/houses/new')),
                    ),
                    MutedText(syncLabel ?? 'まだ同期していません。', small: true),
                    if (catalog == null || catalog.houses.isEmpty)
                      const MutedText('まだ物件がありません。')
                    else
                      _HouseTable(
                        houses: catalog.houses,
                        landlords: catalog.landlords,
                        sources: catalog.sources,
                        onHide: (house, hidden) => _hide(context, snapshot, house, hidden),
                        onDelete: (house) => _delete(context, snapshot, house),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

Future<void> _hide(BuildContext context, AdminCatalogSnapshot snapshot, House house, bool hidden) async {
  final title = house.title.trim().isEmpty ? '（無題）' : house.title.trim();
  final verb = hidden ? '公開ページから外します' : '公開ページに戻します';
  final ok = await askConfirm(context, '「$title」を$verbか？');
  if (!ok) return;
  try {
    await snapshot.repo.setHouseHidden(house.id, hidden);
    if (!context.mounted) return;
    final catalog = snapshot.catalog;
    if (catalog == null) return;
    snapshot.replace(
      AdminCatalog(
        houses: catalog.houses.map((item) => item.id == house.id ? item.copyWith(hidden: hidden) : item).toList(),
        landlords: catalog.landlords,
        sources: catalog.sources,
        status: catalog.status,
      ),
    );
  } catch (error) {
    if (!context.mounted) return;
    ToastScope.of(context).show(firebaseErrorText(error, fallback: '更新に失敗しました。'), ToastKind.error);
  }
}

Future<void> _delete(BuildContext context, AdminCatalogSnapshot snapshot, House house) async {
  final title = house.title.trim().isEmpty ? '（無題）' : house.title.trim();
  final ok = await askConfirm(context, '「$title」を削除しますか？');
  if (!ok) return;
  try {
    await snapshot.repo.deleteManualHouse(house.id);
    if (!context.mounted) return;
    final catalog = snapshot.catalog;
    if (catalog == null) return;
    snapshot.replace(
      AdminCatalog(
        houses: catalog.houses.where((item) => item.id != house.id).toList(),
        landlords: catalog.landlords,
        sources: catalog.sources,
        status: catalog.status,
      ),
    );
  } catch (error) {
    if (!context.mounted) return;
    ToastScope.of(context).show(firebaseErrorText(error, fallback: '削除に失敗しました。'), ToastKind.error);
  }
}

class _HouseTable extends StatelessWidget {
  const _HouseTable({
    required this.houses,
    required this.landlords,
    required this.sources,
    required this.onHide,
    required this.onDelete,
  });

  final List<House> houses;
  final List<BoardLandlord> landlords;
  final List<BoardSource> sources;
  final Future<void> Function(House house, bool hidden) onHide;
  final Future<void> Function(House house) onDelete;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: constraints.maxWidth < 640 ? 640 : constraints.maxWidth),
            child: Table(
              columnWidths: const {
                0: FlexColumnWidth(2.2),
                1: FlexColumnWidth(1.2),
                2: FlexColumnWidth(1.2),
                3: FlexColumnWidth(0.8),
                4: FlexColumnWidth(1.6),
              },
              defaultVerticalAlignment: TableCellVerticalAlignment.top,
              children: [
                TableRow(children: [adminHead('タイトル'), adminHead('大家'), adminHead('ポータル'), adminHead('状態'), adminHead('操作')]),
                for (final house in houses) _row(context, house),
              ],
            ),
          ),
        );
      },
    );
  }

  TableRow _row(BuildContext context, House house) {
    final title = house.title.trim().isEmpty ? '（無題）' : house.title.trim();
    final landlord = landlords.where((item) => item.id == house.landlordId).map((item) => item.name).firstOrNull;
    final portal = portalLabelForHouse(
      fromSync: house.fromSync,
      sourceId: house.sourceId,
      sources: sources.map((item) => (id: item.id, portal: item.portal)).toList(),
    );
    return TableRow(
      children: [
        adminCell(
          house.hidden
              ? Text(title, style: appText())
              : GestureDetector(
                  onTap: () => context.go('/houses/${house.id}'),
                  child: Text(title, style: appText(color: AppColors.primary)),
                ),
        ),
        adminCell(Text(landlord == null || landlord.isEmpty ? '未設定' : landlord, style: appText())),
        adminCell(Text(portal, style: appText())),
        adminCell(Text(house.hidden ? '非表示' : '公開', style: appText())),
        adminCell(
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (house.fromSync)
                AppButton(
                  label: house.hidden ? '再表示' : '非表示',
                  ghost: true,
                  onPressed: () => onHide(house, !house.hidden),
                )
              else ...[
                AppButton(label: '編集', ghost: true, onPressed: () => context.go('/landlord/houses/${house.id}/edit')),
                AppButton(label: '削除', danger: true, onPressed: () => onDelete(house)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

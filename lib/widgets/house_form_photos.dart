import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../logic/house.dart';
import '../logic/photo_files.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_image.dart';
import 'ui.dart';

class HouseFormPhotos extends StatelessWidget {
  const HouseFormPhotos({
    super.key,
    required this.existing,
    required this.pendingBytes,
    required this.saving,
    required this.onPick,
    required this.onRemoveExisting,
    required this.onRemovePending,
  });

  final List<HousePhoto> existing;
  final List<Uint8List> pendingBytes;
  final bool saving;
  final VoidCallback onPick;
  final ValueChanged<String> onRemoveExisting;
  final ValueChanged<int> onRemovePending;

  @override
  Widget build(BuildContext context) {
    final total = existing.length + pendingBytes.length;
    final pendingCount = pendingBytes.length;
    final countNote = total == 0
        ? ''
        : ' 登録済み ${existing.length} 枚${pendingCount > 0 ? ' + 追加予定 $pendingCount 枚' : ''}';
    return LabeledField(
      label: '写真（任意・各 5MB 以下・最大 $maxHousePhotos 枚）',
      child: VStack(
        gap: 8,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: AppButton(
              label: '写真ファイルを選ぶ',
              ghost: true,
              onPressed: total >= maxHousePhotos || saving ? null : onPick,
            ),
          ),
          Text.rich(
            TextSpan(
              style: appText(fontSize: 14, color: AppColors.muted),
              children: [
                const TextSpan(text: 'ファイルを選ぶと下にプレビューが増えます（「新規」バッジ付き）。'),
                TextSpan(
                  text: ' 追加・削除は「保存」ボタンを押すまで確定しません。',
                  style: appText(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.muted),
                ),
                TextSpan(text: '保存後、詳細ページで最大 3 枚ずつ一覧表示されます。$countNote'),
              ],
            ),
          ),
          if (pendingCount > 0) SuccessText('追加予定 $pendingCount 枚があります。「保存」を押してください。'),
          if (total > 0)
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final photo in existing)
                  _PhotoTile(
                    badge: null,
                    onRemove: () => onRemoveExisting(photo.id),
                    child: AppNetworkImage(url: photo.url),
                  ),
                for (var i = 0; i < pendingBytes.length; i++)
                  _PhotoTile(
                    badge: '新規',
                    onRemove: () => onRemovePending(i),
                    child: Image.memory(pendingBytes[i], fit: BoxFit.cover),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.child, required this.badge, required this.onRemove});

  final Widget child;
  final String? badge;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.photo,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Column(
            children: [
              SizedBox(
                width: 140,
                height: 100,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    child,
                    if (badge != null)
                      Positioned(
                        top: 5.6,
                        left: 5.6,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6.4, vertical: 1.6),
                            child: Text(badge!, style: appText(fontSize: 11.2, color: Colors.white, height: 1.4)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: onRemove,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    backgroundColor: AppColors.surface,
                    shape: const RoundedRectangleBorder(),
                    padding: const EdgeInsets.symmetric(vertical: 5.6),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text('削除', style: appText(fontSize: 12.8, color: AppColors.danger)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

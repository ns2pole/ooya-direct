import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_image.dart';

class HousePhotoGrid extends StatelessWidget {
  const HousePhotoGrid({super.key, required this.photos, required this.title});

  final List<String> photos;
  final String title;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) return const SizedBox.shrink();
    final altBase = title.isEmpty ? '物件の画像' : '$titleの画像';
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: photos.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 10.4,
          mainAxisSpacing: 10.4,
          childAspectRatio: 4 / 3,
        ),
        itemBuilder: (context, index) {
          return Material(
            color: AppColors.photo,
            borderRadius: BorderRadius.circular(8),
            clipBehavior: Clip.antiAlias,
            child: AppNetworkImage(
              url: photos[index],
              onTap: () => _open(context, index, altBase),
            ),
          );
        },
      ),
    );
  }

  Future<void> _open(BuildContext context, int index, String altBase) {
    return showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '閉じる',
      barrierColor: const Color.fromRGBO(15, 18, 28, 0.88),
      pageBuilder: (context, _, _) {
        return _Lightbox(photos: photos, initialIndex: index, altBase: altBase);
      },
    );
  }
}

class _Lightbox extends StatefulWidget {
  const _Lightbox({
    required this.photos,
    required this.initialIndex,
    required this.altBase,
  });

  final List<String> photos;
  final int initialIndex;
  final String altBase;

  @override
  State<_Lightbox> createState() => _LightboxState();
}

class _LightboxState extends State<_Lightbox> {
  late int index = widget.initialIndex;

  @override
  Widget build(BuildContext context) {
    final count = widget.photos.length;
    return Focus(
      autofocus: true,
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent) return KeyEventResult.ignored;
        if (event.logicalKey == LogicalKeyboardKey.escape) {
          Navigator.pop(context);
          return KeyEventResult.handled;
        }
        if (count <= 1) return KeyEventResult.ignored;
        if (event.logicalKey == LogicalKeyboardKey.arrowLeft && index > 0) {
          setState(() => index -= 1);
          return KeyEventResult.handled;
        }
        if (event.logicalKey == LogicalKeyboardKey.arrowRight &&
            index < count - 1) {
          setState(() => index += 1);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const SizedBox.expand(),
              ),
            ),
            Center(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 40, 20, 20),
                child: GestureDetector(
                  onTap: () {},
                  child: SizedBox(
                    width: MediaQuery.sizeOf(context).width - 40,
                    height: MediaQuery.sizeOf(context).height - 80,
                    child: AppNetworkImage(
                      url: widget.photos[index],
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 12,
              right: 12,
              child: _RoundButton(
                label: '×',
                tooltip: '閉じる',
                onPressed: () => Navigator.pop(context),
              ),
            ),
            if (count > 1) ...[
              Positioned(
                left: 12,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _RoundButton(
                    label: '‹',
                    tooltip: '前の写真',
                    onPressed: index == 0
                        ? null
                        : () => setState(() => index -= 1),
                  ),
                ),
              ),
              Positioned(
                right: 12,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _RoundButton(
                    label: '›',
                    tooltip: '次の写真',
                    onPressed: index == count - 1
                        ? null
                        : () => setState(() => index += 1),
                  ),
                ),
              ),
              Positioned(
                bottom: 16,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10.4,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color.fromRGBO(255, 255, 255, 0.15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${index + 1} / $count',
                      style: appText(fontSize: 13.6, color: Colors.white),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.label,
    required this.tooltip,
    required this.onPressed,
  });

  final String label;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Opacity(
        opacity: onPressed == null ? 0.35 : 1,
        child: Material(
          color: const Color.fromRGBO(255, 255, 255, 0.92),
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onPressed,
            child: SizedBox(
              width: 40,
              height: 40,
              child: Center(
                child: Text(
                  label,
                  style: appText(fontSize: label == '×' ? 24 : 28, height: 1),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

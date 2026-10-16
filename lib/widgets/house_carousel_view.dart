import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../logic/house.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_image.dart';
import 'house_property_table.dart';

class HouseCarouselView extends StatelessWidget {
  const HouseCarouselView({
    super.key,
    required this.house,
    required this.title,
    required this.count,
    required this.canPrev,
    required this.canNext,
    required this.mainUrl,
    required this.thumbs,
    required this.onOpenDetail,
    required this.onPrev,
    required this.onNext,
    required this.onSelectPhoto,
  });

  final House house;
  final String title;
  final int count;
  final bool canPrev;
  final bool canNext;
  final String? mainUrl;
  final List<({String url, int index})> thumbs;
  final VoidCallback onOpenDetail;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final ValueChanged<int> onSelectPhoto;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (count > 1) ...[
          Row(
            children: [
              CarouselNavButton(previous: true, enabled: canPrev, onPressed: onPrev),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: appText(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppColors.muted,
                      height: 1.4,
                      decoration: TextDecoration.none,
                    ),
                    children: [
                      TextSpan(
                        text: 'メイン画像タップ',
                        style: appText(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                          height: 1.4,
                          decoration: TextDecoration.none,
                        ),
                      ),
                      const TextSpan(text: 'で詳細、'),
                      TextSpan(
                        text: '左右スワイプ',
                        style: appText(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                          height: 1.4,
                          decoration: TextDecoration.none,
                        ),
                      ),
                      const TextSpan(text: 'で他物件へ'),
                    ],
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              CarouselNavButton(previous: false, enabled: canNext, onPressed: onNext),
            ],
          ),
          const SizedBox(height: 12),
        ],
        DecoratedBox(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(9),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AspectRatio(
                  aspectRatio: 4 / 3,
                  child: DecoratedBox(
                    decoration: const BoxDecoration(
                      color: AppColors.photo,
                      border: Border(bottom: BorderSide(color: AppColors.border)),
                    ),
                    child: mainUrl == null
                        ? GestureDetector(onTap: onOpenDetail, child: const _EmptyHero())
                        : AppNetworkImage(
                            url: mainUrl!,
                            onTap: onOpenDetail,
                            onSwipe: (dx) {
                              if (dx > 0 && canPrev) onPrev();
                              if (dx < 0 && canNext) onNext();
                            },
                          ),
                  ),
                ),
                if (thumbs.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 7.2, bottom: 2.4),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final width = constraints.maxWidth / 3.5;
                        return SizedBox(
                          height: width * 3 / 4,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: thumbs.length,
                            separatorBuilder: (_, _) => const SizedBox(width: 5.6),
                            itemBuilder: (context, i) {
                              final item = thumbs[i];
                              return SizedBox(
                                width: width,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: AppNetworkImage(
                                    url: item.url,
                                    onTap: () => onSelectPhoto(item.index),
                                  ),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ),
                GestureDetector(
                  onTap: onOpenDetail,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(17.6, 16, 17.6, 0),
                    child: Text(
                      title,
                      style: appText(fontSize: 15.2, fontWeight: FontWeight.w600, decoration: TextDecoration.none),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(17.6, 16, 17.6, 18.4),
                  child: HousePropertyTable(house: house),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyHero extends StatelessWidget {
  const _EmptyHero();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFE8EAF3), Color(0xFFF1F3F9)],
        ),
      ),
    );
  }
}

class CarouselNavButton extends StatelessWidget {
  const CarouselNavButton({super.key, required this.previous, required this.enabled, required this.onPressed});

  final bool previous;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.28,
      child: SizedBox(
        width: 33.6,
        height: 41.6,
        child: IconButton(
          padding: EdgeInsets.zero,
          tooltip: previous ? '前の物件' : '次の物件',
          onPressed: enabled ? onPressed : null,
          icon: Transform.rotate(
            angle: previous ? math.pi / 2 : -math.pi / 2,
            child: Text('▼', style: appText(fontSize: 18.4, height: 1)),
          ),
        ),
      ),
    );
  }
}

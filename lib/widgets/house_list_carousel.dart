import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../logic/house.dart';
import '../state/app_state.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_image.dart';
import 'house_property_table.dart';

class HouseListCarousel extends StatefulWidget {
  const HouseListCarousel({
    super.key,
    required this.houses,
    required this.loadPhotoUrls,
    required this.onProgress,
  });

  final List<House> houses;
  final Future<List<String>> Function(String houseId) loadPhotoUrls;
  final ValueChanged<ListProgress?> onProgress;

  @override
  State<HouseListCarousel> createState() => _HouseListCarouselState();
}

class _HouseListCarouselState extends State<HouseListCarousel> {
  String? _loadedId;
  List<String> _photoUrls = const [];
  int _selectedPhoto = 0;

  House? get _house {
    if (widget.houses.isEmpty) return null;
    final requested = GoRouterState.of(context)
        .uri
        .queryParameters[houseListQueryKey];
    final index = clampCarouselIndex(
      indexForHouseId(widget.houses, requested),
      widget.houses.length,
    );
    return widget.houses[index];
  }

  int get _index {
    final house = _house;
    if (house == null) return 0;
    return indexForHouseId(widget.houses, house.id);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncUrl();
    _loadPhotos();
    _emitProgress();
  }

  @override
  void didUpdateWidget(HouseListCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncUrl();
    _loadPhotos();
    _emitProgress();
  }

  void _syncUrl() {
    final house = _house;
    if (house == null) return;
    final current = GoRouterState.of(context)
        .uri
        .queryParameters[houseListQueryKey];
    if (current == house.id) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final latest = _house;
      if (latest == null) return;
      final now = GoRouterState.of(context)
          .uri
          .queryParameters[houseListQueryKey];
      if (now == latest.id) return;
      context.replace(homePathForHouse(latest.id));
    });
  }

  void _loadPhotos() {
    final house = _house;
    if (house == null || house.id == _loadedId) return;
    _loadedId = house.id;
    _photoUrls = const [];
    _selectedPhoto = 0;
    final id = house.id;
    widget
        .loadPhotoUrls(id)
        .then((urls) {
          if (!mounted || _loadedId != id) return;
          setState(() => _photoUrls = urls);
        })
        .catchError((_) {
          if (!mounted || _loadedId != id) return;
          setState(() => _photoUrls = const []);
        });
  }

  void _emitProgress() {
    final house = _house;
    ListProgress? next;
    if (house != null && widget.houses.isNotEmpty) {
      final summary = houseListSummaryLines(house);
      next = ListProgress(
        current: _index + 1,
        total: widget.houses.length,
        listedDate: summary.listedDate,
      );
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onProgress(next);
    });
  }

  void _select(int nextIndex) {
    final next =
        widget.houses[clampCarouselIndex(nextIndex, widget.houses.length)];
    context.replace(homePathForHouse(next.id));
  }

  void _openDetail() {
    final house = _house;
    if (house == null) return;
    context.go('/houses/${house.id}');
  }

  @override
  Widget build(BuildContext context) {
    final house = _house;
    if (house == null) return const SizedBox.shrink();
    final summary = houseListSummaryLines(house);
    final count = widget.houses.length;
    final index = _index;
    final canPrev = index > 0;
    final canNext = index < count - 1;
    final cover = house.coverPhotoUrl;
    final gallery = _photoUrls.isNotEmpty
        ? _photoUrls
        : cover != null && cover.isNotEmpty
        ? [cover]
        : <String>[];
    final selected = gallery.isEmpty
        ? 0
        : math.min(_selectedPhoto, gallery.length - 1);
    final mainUrl = gallery.isEmpty ? null : gallery[selected];
    final thumbs = <({String url, int index})>[];
    if (gallery.length > 1) {
      for (var i = 0; i < gallery.length; i++) {
        if (i == selected) continue;
        thumbs.add((url: gallery[i], index: i));
      }
    }

    return Focus(
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent) return KeyEventResult.ignored;
        if (event.logicalKey == LogicalKeyboardKey.arrowLeft && canPrev) {
          _select(index - 1);
          return KeyEventResult.handled;
        }
        if (event.logicalKey == LogicalKeyboardKey.arrowRight && canNext) {
          _select(index + 1);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (count > 1) ...[
            Row(
              children: [
                _NavButton(
                  previous: true,
                  enabled: canPrev,
                  onPressed: () => _select(index - 1),
                ),
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
                _NavButton(
                  previous: false,
                  enabled: canNext,
                  onPressed: () => _select(index + 1),
                ),
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
                        border: Border(
                          bottom: BorderSide(color: AppColors.border),
                        ),
                      ),
                      child: mainUrl == null
                          ? GestureDetector(
                              onTap: _openDetail,
                              child: const _EmptyHero(),
                            )
                          : AppNetworkImage(
                              url: mainUrl,
                              onTap: _openDetail,
                              onSwipe: (dx) {
                                if (dx > 0 && canPrev) _select(index - 1);
                                if (dx < 0 && canNext) _select(index + 1);
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
                              separatorBuilder: (_, _) =>
                                  const SizedBox(width: 5.6),
                              itemBuilder: (context, i) {
                                final item = thumbs[i];
                                return SizedBox(
                                  width: width,
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: AppNetworkImage(
                                      url: item.url,
                                      onTap: () => setState(
                                        () => _selectedPhoto = item.index,
                                      ),
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
                    onTap: _openDetail,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(17.6, 16, 17.6, 0),
                      child: Text(
                        summary.title,
                        style: appText(
                          fontSize: 15.2,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.none,
                        ),
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
      ),
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

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.previous,
    required this.enabled,
    required this.onPressed,
  });

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

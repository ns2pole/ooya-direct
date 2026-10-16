import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../logic/house.dart';
import '../state/app_state.dart';
import 'house_carousel_view.dart';

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
      child: HouseCarouselView(
        house: house,
        title: summary.title,
        count: count,
        canPrev: canPrev,
        canNext: canNext,
        mainUrl: mainUrl,
        thumbs: thumbs,
        onOpenDetail: _openDetail,
        onPrev: () => _select(index - 1),
        onNext: () => _select(index + 1),
        onSelectPhoto: (photoIndex) => setState(() => _selectedPhoto = photoIndex),
      ),
    );
  }
}

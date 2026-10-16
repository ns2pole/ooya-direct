import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AppNetworkImage extends StatefulWidget {
  const AppNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.onTap,
    this.onSwipe,
  });

  final String url;
  final BoxFit fit;
  final VoidCallback? onTap;
  final ValueChanged<double>? onSwipe;

  @override
  State<AppNetworkImage> createState() => _AppNetworkImageState();
}

class _AppNetworkImageState extends State<AppNetworkImage> {
  var _dragDx = 0.0;

  @override
  Widget build(BuildContext context) {
    final onSwipe = widget.onSwipe;
    return GestureDetector(
      onTap: widget.onTap,
      onHorizontalDragStart: onSwipe == null ? null : (_) => _dragDx = 0,
      onHorizontalDragUpdate: onSwipe == null
          ? null
          : (details) => _dragDx += details.delta.dx,
      onHorizontalDragEnd: onSwipe == null
          ? null
          : (_) {
              final dx = _dragDx;
              if (dx.abs() <= 50) return;
              onSwipe(dx);
            },
      child: SizedBox.expand(
        child: Image.network(
          widget.url,
          fit: widget.fit,
          errorBuilder: (_, _, _) => const ColoredBox(color: AppColors.photo),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

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
    final fit = widget.fit == BoxFit.contain ? 'contain' : 'cover';
    final onSwipe = widget.onSwipe;
    return ColoredBox(
      color: AppColors.photo,
      child: Stack(
        fit: StackFit.expand,
        children: [
          HtmlElementView.fromTagName(
            key: ValueKey('${widget.url}-$fit'),
            tagName: 'img',
            onElementCreated: (element) => _show(element as web.HTMLImageElement, fit),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.onTap,
            onHorizontalDragStart: onSwipe == null ? null : (_) => _dragDx = 0,
            onHorizontalDragUpdate: onSwipe == null ? null : (details) => _dragDx += details.delta.dx,
            onHorizontalDragEnd: onSwipe == null
                ? null
                : (_) {
                    final dx = _dragDx;
                    if (dx.abs() <= 50) return;
                    onSwipe(dx);
                  },
            child: const SizedBox.expand(),
          ),
        ],
      ),
    );
  }

  void _show(web.HTMLImageElement img, String fit) {
    img
      ..src = widget.url
      ..alt = ''
      ..draggable = false;
    img.style
      ..width = '100%'
      ..height = '100%'
      ..objectFit = fit
      ..display = 'block'
      ..backgroundColor = '#f1f3f9'
      ..pointerEvents = 'none';
    WidgetsBinding.instance.addPostFrameCallback((_) => _letClicksThrough());
  }

  void _letClicksThrough() {
    final views = web.document.querySelectorAll('flt-platform-view');
    for (var i = 0; i < views.length; i++) {
      final view = views.item(i);
      if (view != null) (view as web.HTMLElement).style.pointerEvents = 'none';
    }
    final pane = web.document.querySelector('flt-glass-pane');
    final root = pane?.shadowRoot;
    if (root == null || root.querySelector('#ooya-pass-clicks') != null) return;
    final style = web.document.createElement('style') as web.HTMLStyleElement;
    style.id = 'ooya-pass-clicks';
    style.textContent = 'flt-platform-view-slot, flt-platform-view, img { pointer-events: none !important; }';
    root.append(style);
  }
}

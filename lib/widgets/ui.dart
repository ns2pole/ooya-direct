import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.gap = 0});

  final Widget child;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final narrow = MediaQuery.sizeOf(context).width <= 640;
    return Container(
      width: double.infinity,
      padding: narrow
          ? const EdgeInsets.symmetric(horizontal: 10.8, vertical: 10)
          : const EdgeInsets.fromLTRB(21.6, 20, 21.6, 20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border.fromBorderSide(BorderSide(color: AppColors.border)),
        boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 2, offset: Offset(0, 1))],
      ),
      child: child,
    );
  }
}

class VStack extends StatelessWidget {
  const VStack({super.key, required this.children, this.gap = 13.6});

  final List<Widget> children;
  final double gap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) SizedBox(height: gap),
          children[i],
        ],
      ],
    );
  }
}

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.primary = false,
    this.ghost = false,
    this.danger = false,
    this.compact = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool primary;
  final bool ghost;
  final bool danger;
  final bool compact;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final bg = primary
        ? AppColors.primary
        : danger
            ? AppColors.dangerBg
            : ghost
                ? Colors.transparent
                : AppColors.surface;
    final fg = primary
        ? Colors.white
        : danger
            ? AppColors.danger
            : AppColors.text;
    final border = primary
        ? AppColors.primary
        : danger
            ? const Color(0xFFFECACA)
            : AppColors.border;
    final radius = BorderRadius.circular(8);
    return Opacity(
      opacity: onPressed == null ? 0.6 : 1,
      child: Material(
        color: bg,
        borderRadius: radius,
        child: InkWell(
          onTap: onPressed,
          borderRadius: radius,
          hoverColor: primary ? AppColors.primaryHover : null,
          child: Container(
            padding: compact
                ? const EdgeInsets.symmetric(horizontal: 12, vertical: 5.6)
                : const EdgeInsets.symmetric(horizontal: 13.6, vertical: 7.2),
            decoration: BoxDecoration(
              borderRadius: radius,
              border: Border.all(color: onPressed == null && primary ? AppColors.primary : border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[icon!, const SizedBox(width: 6.4)],
                Text(
                  label,
                  style: appText(
                    fontSize: compact ? 14 : 16,
                    fontWeight: compact ? FontWeight.w600 : FontWeight.w400,
                    color: fg,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.child,
    this.emphasis = false,
  });

  final String label;
  final Widget child;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: emphasis
              ? appText(fontSize: 16, fontWeight: FontWeight.w600)
              : appText(fontSize: 14.4, height: 1.4),
        ),
        const SizedBox(height: 5.6),
        child,
      ],
    );
  }
}

class ErrorText extends StatelessWidget {
  const ErrorText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: appText(color: AppColors.danger));
  }
}

class SuccessText extends StatelessWidget {
  const SuccessText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: appText(color: AppColors.success));
  }
}

class MutedText extends StatelessWidget {
  const MutedText(this.text, {super.key, this.small = false});

  final String text;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: appText(fontSize: small ? 14 : 16, color: AppColors.muted));
  }
}

Future<bool> askConfirm(BuildContext context, String message) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) {
      return AlertDialog(
        backgroundColor: AppColors.surface,
        content: Text(message, style: appText()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('キャンセル', style: appText(color: AppColors.muted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('OK', style: appText(color: AppColors.primary, fontWeight: FontWeight.w600)),
          ),
        ],
      );
    },
  );
  return result ?? false;
}

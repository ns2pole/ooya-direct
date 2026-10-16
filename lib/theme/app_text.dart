import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

TextStyle appText({
  double fontSize = 16,
  FontWeight fontWeight = FontWeight.w400,
  Color color = AppColors.text,
  double height = 1.5,
  TextDecoration? decoration,
  double? letterSpacing,
}) {
  return GoogleFonts.notoSansJp(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    height: height,
    decoration: decoration,
    letterSpacing: letterSpacing,
  );
}

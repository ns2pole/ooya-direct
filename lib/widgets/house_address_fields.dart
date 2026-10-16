import 'package:flutter/material.dart';

import 'address_suggest_field.dart';

class HouseAddressFields extends StatelessWidget {
  const HouseAddressFields({
    super.key,
    required this.prefecture,
    required this.city,
    required this.town,
    required this.prefectures,
    required this.cities,
    required this.towns,
    required this.loadingPrefectures,
    required this.loadingTowns,
    required this.onPrefecture,
    required this.onCity,
    required this.onTown,
  });

  final String prefecture;
  final String city;
  final String town;
  final List<String> prefectures;
  final List<String> cities;
  final List<String> towns;
  final bool loadingPrefectures;
  final bool loadingTowns;
  final ValueChanged<String> onPrefecture;
  final ValueChanged<String> onCity;
  final ValueChanged<String> onTown;

  @override
  Widget build(BuildContext context) {
    final fields = [
      AddressSuggestField(
        label: '都道府県',
        value: prefecture,
        options: prefectures,
        loading: loadingPrefectures,
        placeholder: '例: 東京都',
        onChanged: onPrefecture,
      ),
      AddressSuggestField(
        label: '市区町村',
        value: city,
        options: cities,
        enabled: prefecture.isNotEmpty,
        placeholder: prefecture.isEmpty ? '先に都道府県' : '例: 新宿区',
        onChanged: onCity,
      ),
      AddressSuggestField(
        label: '町名（大字・丁目など）',
        value: town,
        options: towns,
        enabled: prefecture.isNotEmpty && city.isNotEmpty,
        loading: loadingTowns,
        placeholder: city.isEmpty ? '先に市区町村' : '候補から選ぶか入力',
        onChanged: onTown,
      ),
    ];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < fields.length; i++) ...[
          if (i > 0) const SizedBox(width: 12),
          Expanded(child: fields[i]),
        ],
      ],
    );
  }
}

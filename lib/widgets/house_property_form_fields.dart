import 'package:flutter/material.dart';

import '../logic/house.dart';
import '../theme/app_text.dart';
import 'ui.dart';

class HousePropertyFormFields extends StatefulWidget {
  const HousePropertyFormFields({
    super.key,
    required this.fields,
    required this.resetToken,
    required this.onChanged,
  });

  final HousePropertyFields fields;
  final int resetToken;
  final ValueChanged<HousePropertyFields> onChanged;

  @override
  State<HousePropertyFormFields> createState() => _HousePropertyFormFieldsState();
}

class _HousePropertyFormFieldsState extends State<HousePropertyFormFields> {
  late final TextEditingController _rent;
  late final TextEditingController _managementFee;
  late final TextEditingController _depositKeyMoney;
  late final TextEditingController _floorArea;
  late final TextEditingController _floors;
  late final TextEditingController _buildingAge;
  late final TextEditingController _referenceUrl;

  @override
  void initState() {
    super.initState();
    final fields = widget.fields;
    _rent = TextEditingController(text: fields.rent);
    _managementFee = TextEditingController(text: fields.managementFee);
    _depositKeyMoney = TextEditingController(text: fields.depositKeyMoney);
    _floorArea = TextEditingController(text: fields.floorArea);
    _floors = TextEditingController(text: fields.floors);
    _buildingAge = TextEditingController(text: fields.buildingAge);
    _referenceUrl = TextEditingController(text: fields.referenceUrl);
  }

  @override
  void didUpdateWidget(HousePropertyFormFields oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.resetToken == oldWidget.resetToken) return;
    final fields = widget.fields;
    _rent.text = fields.rent;
    _managementFee.text = fields.managementFee;
    _depositKeyMoney.text = fields.depositKeyMoney;
    _floorArea.text = fields.floorArea;
    _floors.text = fields.floors;
    _buildingAge.text = fields.buildingAge;
    _referenceUrl.text = fields.referenceUrl;
  }

  @override
  void dispose() {
    _rent.dispose();
    _managementFee.dispose();
    _depositKeyMoney.dispose();
    _floorArea.dispose();
    _floors.dispose();
    _buildingAge.dispose();
    _referenceUrl.dispose();
    super.dispose();
  }

  void _emit(HousePropertyFields next) => widget.onChanged(next);

  @override
  Widget build(BuildContext context) {
    final fields = widget.fields;
    return VStack(
      gap: 10.4,
      children: [
        _pair(
          _text('家賃', _rent, '例: 8.5万円', (value) => _emit(fields.copyWith(rent: value))),
          _text('管理費等', _managementFee, '例: 5000円', (value) => _emit(fields.copyWith(managementFee: value))),
        ),
        _pair(
          _select('ジャンル', fields.genre, houseGenreOptions, (value) => _emit(fields.copyWith(genre: value))),
          _text('敷/礼', _depositKeyMoney, '例: 1ヶ月/1ヶ月', (value) => _emit(fields.copyWith(depositKeyMoney: value))),
        ),
        _pair(
          _select('間取り', fields.areaSize, areaSizeOptions, (value) => _emit(fields.copyWith(areaSize: value))),
          _text('面積', _floorArea, '例: 45㎡', (value) => _emit(fields.copyWith(floorArea: value))),
        ),
        _pair(
          _text('階建', _floors, '例: 3階建 / 2階', (value) => _emit(fields.copyWith(floors: value))),
          _text('築年数', _buildingAge, '例: 築15年', (value) => _emit(fields.copyWith(buildingAge: value))),
        ),
        _text(
          '参考リンク',
          _referenceUrl,
          '例: https://www.yahoo.co.jp',
          (value) => _emit(fields.copyWith(referenceUrl: value)),
          maxLength: 2048,
        ),
      ],
    );
  }

  Widget _pair(Widget left, Widget right) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth <= 420) {
          return VStack(gap: 10.4, children: [left, right]);
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: left),
            const SizedBox(width: 12),
            Expanded(child: right),
          ],
        );
      },
    );
  }

  Widget _text(
    String label,
    TextEditingController controller,
    String hint,
    ValueChanged<String> onChanged, {
    int maxLength = 50,
  }) {
    return LabeledField(
      label: label,
      child: TextField(
        controller: controller,
        maxLength: maxLength,
        style: appText(),
        keyboardType: label == '参考リンク' ? TextInputType.url : TextInputType.text,
        decoration: InputDecoration(hintText: hint, counterText: ''),
        onChanged: onChanged,
      ),
    );
  }

  Widget _select(String label, String value, List<String> options, ValueChanged<String> onChanged) {
    final known = value.isEmpty || options.contains(value);
    final items = <String>['', ...options, if (!known) value];
    return LabeledField(
      label: label,
      child: DropdownButtonFormField<String>(
        key: ValueKey('$label-${widget.resetToken}-$value'),
        initialValue: items.contains(value) ? value : '',
        items: [
          for (final item in items)
            DropdownMenuItem(
              value: item,
              child: Text(item.isEmpty ? '任意' : item, style: appText()),
            ),
        ],
        onChanged: (next) => onChanged(next ?? ''),
      ),
    );
  }
}

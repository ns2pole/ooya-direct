import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../address/geolonia.dart';
import '../data/admin_repository.dart';
import '../data/house_editor.dart';
import '../data/house_map.dart';
import '../data/house_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../logic/photo_files.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/house_address_fields.dart';
import '../widgets/house_form_photos.dart';
import '../widgets/house_property_form_fields.dart';
import '../widgets/ui.dart';

enum _SaveStatus { idle, saving, success, error }

class HouseFormPage extends StatefulWidget {
  const HouseFormPage({
    super.key,
    this.houseId,
    this.initialLandlordId,
    this.photosAfterSave,
  });

  final String? houseId;
  final String? initialLandlordId;
  final List<HousePhoto>? photosAfterSave;

  bool get isNew => houseId == null;

  @override
  State<HouseFormPage> createState() => _HouseFormPageState();
}

class _HouseFormPageState extends State<HouseFormPage> {
  final _addresses = GeoloniaClient();
  HouseRepository? _houses;
  HouseEditor? _editor;

  HouseRepository get _houseRepo => _houses ??= HouseRepository();
  HouseEditor get _houseEditor => _editor ??= HouseEditor();
  final _title = TextEditingController();
  final _description = TextEditingController();

  List<BoardLandlord> _landlords = const [];
  bool _landlordsLoading = false;
  String _landlordId = '';
  String _prefecture = '';
  String _city = '';
  String _town = '';
  HousePropertyFields _fields = HousePropertyFields.empty;
  int _fieldsToken = 0;
  List<HousePhoto> _existing = const [];
  final _removed = <String>{};
  final _pending = <({Uint8List bytes, String name, String? mimeType})>[];
  bool _loading = false;
  bool _saving = false;
  String? _loadError;
  String? _formError;
  _SaveStatus _saveStatus = _SaveStatus.idle;
  String _saveStatusMessage = '';
  List<AddressPrefecture>? _prefs;
  bool _loadingPrefs = true;
  bool _loadingTowns = false;
  String? _addressError;
  final _towns = <String, List<String>>{};
  bool _loadStarted = false;

  @override
  void initState() {
    super.initState();
    _landlordId = widget.initialLandlordId ?? '';
    _loading = !widget.isNew;
    _landlordsLoading = widget.isNew;
    _loadAddresses();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = AuthScope.of(context);
    if (auth.loading || _loadStarted) return;
    _loadStarted = true;
    _loadLandlords();
    _loadHouse();
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _addresses.close();
    super.dispose();
  }

  Future<void> _loadAddresses() async {
    try {
      final prefs = await _addresses.prefectures();
      if (!mounted) return;
      setState(() {
        _prefs = prefs;
        _addressError = null;
        _loadingPrefs = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _addressError = error is Exception ? '$error'.replaceFirst('Exception: ', '') : '住所マスタの取得に失敗しました。';
        _loadingPrefs = false;
      });
    }
  }

  Future<void> _loadLandlords() async {
    if (!widget.isNew || !FirebaseEnv.isConfigured) return;
    final user = AuthScope.of(context).user;
    if (user == null) {
      if (mounted) setState(() => _landlordsLoading = false);
      return;
    }
    try {
      final catalog = await _houseRepo.listLandlords(user.uid);
      if (!mounted) return;
      setState(() {
        _landlords = [
          for (final item in catalog) BoardLandlord(id: item.id, name: item.name),
        ];
        if (!_landlords.any((item) => item.id == _landlordId)) {
          _landlordId = _landlords.length == 1 ? _landlords.first.id : '';
        }
        _landlordsLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _landlordsLoading = false);
    }
  }

  Future<void> _loadHouse() async {
    final houseId = widget.houseId;
    final user = AuthScope.of(context).user;
    if (!FirebaseEnv.isConfigured || widget.isNew || houseId == null || user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final snap = await _houseRepo.getHouse(houseId);
      if (!mounted) return;
      if (snap == null) {
        setState(() {
          _loadError = '物件が見つかりません。';
          _loading = false;
        });
        return;
      }
      final data = snap.data;
      if (data['ownerId']?.toString() != user.uid) {
        setState(() {
          _loadError = 'この物件を編集する権限がありません。';
          _loading = false;
        });
        return;
      }
      if (data['fromSync'] == true) {
        setState(() {
          _loadError = '同期で取り込んだ物件は編集できません。';
          _loading = false;
        });
        return;
      }
      final photos = await _houseRepo.loadHousePhotosForDisplay(houseId, data);
      final carried = widget.photosAfterSave;
      final display = carried != null && carried.isNotEmpty ? carried : photos;
      final loaded = readHousePropertyFields(data);
      final area = loaded.areaSize.trim();
      if (!mounted) return;
      setState(() {
        _title.text = '${data['title'] ?? ''}';
        _description.text = '${data['description'] ?? ''}';
        _prefecture = '${data['prefecture'] ?? ''}';
        _city = '${data['city'] ?? ''}';
        _town = '${data['town'] ?? ''}';
        _fields = loaded.copyWith(areaSize: isKnownLayoutAreaSize(area) ? area : '');
        _fieldsToken += 1;
        _existing = display;
        _removed.clear();
        _pending.clear();
        _loadError = null;
        _formError = null;
        _saveStatus = _SaveStatus.idle;
        _saveStatusMessage = '';
        _loading = false;
      });
      _ensureTowns();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = error is Exception ? '$error'.replaceFirst('Exception: ', '') : '読み込みに失敗しました。';
        _loading = false;
      });
    }
  }

  List<String> get _prefList => _prefs == null ? const [] : prefectureNames(_prefs!);

  List<String> get _cityList {
    final prefs = _prefs;
    if (prefs == null || _prefecture.isEmpty) return const [];
    return cityNamesFor(prefs, _prefecture);
  }

  String get _townKey => _prefecture.isEmpty || _city.isEmpty ? '' : '$_prefecture\t$_city';

  List<String> get _townList => _townKey.isEmpty ? const [] : (_towns[_townKey] ?? const []);

  Future<void> _ensureTowns() async {
    final key = _townKey;
    if (key.isEmpty || _towns.containsKey(key)) return;
    setState(() => _loadingTowns = true);
    try {
      final names = await _addresses.towns(_prefecture, _city);
      if (!mounted) return;
      setState(() {
        _towns[key] = names;
        _loadingTowns = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _towns[key] = const [];
        _loadingTowns = false;
      });
    }
  }

  List<HousePhoto> get _activeExisting => _existing.where((photo) => !_removed.contains(photo.id)).toList();

  HouseTextFields get _text => HouseTextFields(
        title: _title.text,
        description: _description.text,
        prefecture: _prefecture,
        city: _city,
        town: _town,
        fields: _fields,
      );

  void _showValidation(String message, {bool toast = false}) {
    setState(() {
      _formError = message;
      _saveStatus = _SaveStatus.error;
      _saveStatusMessage = message;
    });
    if (toast) ToastScope.of(context).show(message, ToastKind.error);
  }

  void _resetStatus() {
    if (_saveStatus == _SaveStatus.idle && _saveStatusMessage.isEmpty) return;
    setState(() {
      _saveStatus = _SaveStatus.idle;
      _saveStatusMessage = '';
    });
  }

  bool _referenceUrlOk(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return true;
    final uri = Uri.tryParse(trimmed);
    return uri != null && uri.hasScheme;
  }

  Future<void> _pickPhotos() async {
    final picked = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
    );
    if (!mounted || picked.isEmpty) return;
    final files = <({Uint8List bytes, String name, int size, String? mimeType})>[];
    try {
      for (final file in picked) {
        final bytes = await file.readAsBytes();
        files.add((
          bytes: bytes,
          name: file.name,
          size: file.lengthSync() ?? bytes.length,
          mimeType: file.xFile.mimeType,
        ));
      }
    } catch (_) {
      if (mounted) _showValidation('画像の読み込みに失敗しました。', toast: true);
      return;
    }
    if (!mounted) return;
    final error = photoSelectionError(
      existingCount: _activeExisting.length,
      pendingCount: _pending.length,
      files: files.map((file) => (name: file.name, size: file.size, mimeType: file.mimeType)).toList(),
    );
    if (error != null) {
      _showValidation(error, toast: true);
      return;
    }
    setState(() {
      _formError = null;
      _saveStatus = _SaveStatus.idle;
      _saveStatusMessage = '';
      _pending.addAll(files.map((file) => (bytes: file.bytes, name: file.name, mimeType: file.mimeType)));
    });
    ToastScope.of(context).show('${files.length}枚追加しました。下の「保存」ボタンを押すと登録されます。', ToastKind.success);
  }

  Future<void> _save() async {
    if (_title.text.isEmpty) {
      _showValidation('入力内容を確認してください（タイトルは必須です）。');
      return;
    }
    if (!_referenceUrlOk(_fields.referenceUrl)) {
      _showValidation('入力内容を確認してください（タイトルは必須です）。');
      return;
    }
    final user = AuthScope.of(context).user;
    if (user == null) {
      _showValidation('ログインが必要です。再度ログインしてください。');
      return;
    }
    if (widget.isNew && _landlordId.isEmpty) {
      _showValidation('大家を選択してください。');
      return;
    }
    if (!FirebaseEnv.isConfigured) {
      _showValidation('Firebase が未設定です。環境変数を確認してください。');
      return;
    }

    setState(() {
      _saving = true;
      _formError = null;
      _saveStatus = _SaveStatus.saving;
      _saveStatusMessage = '保存を開始しています…';
    });

    final pending = _pending
        .map((file) => PendingPhotoFile(name: file.name, bytes: file.bytes, mimeType: file.mimeType))
        .toList();
    final removed = Set<String>.of(_removed);
    final photoChanged = removed.isNotEmpty || pending.isNotEmpty;
    final expectedNew = pending.length;

    try {
      if (widget.isNew) {
        final id = await _houseEditor.createHouse(ownerId: user.uid, landlordId: _landlordId, text: _text);
        var saved = const <HousePhoto>[];
        if (photoChanged) {
          saved = await _houseEditor.saveHouseWithPhotos(
            houseId: id,
            ownerId: user.uid,
            text: _text,
            existing: const [],
            removedIds: const {},
            pendingFiles: pending,
            photoChanged: true,
            onProgress: _onProgress,
          );
        }
        final photosSaved = saved.isNotEmpty;
        final failedPhotos = !photosSaved && expectedNew > 0;
        final message = photosSaved
            ? '物件を登録しました（写真 ${saved.length} 枚）'
            : failedPhotos
                ? '物件は登録しましたが、写真が保存されませんでした。もう一度ファイルを選んで保存してください。'
                : '物件を登録しました';
        if (!mounted) return;
        setState(() {
          _saveStatus = failedPhotos ? _SaveStatus.error : _SaveStatus.success;
          _saveStatusMessage = message;
          _formError = failedPhotos ? message : null;
        });
        ToastScope.of(context).show(message, failedPhotos ? ToastKind.error : ToastKind.success);
        context.go('/landlord/houses/$id/edit', extra: photosSaved ? saved : null);
      } else {
        final houseId = widget.houseId!;
        final saved = await _houseEditor.saveHouseWithPhotos(
          houseId: houseId,
          ownerId: user.uid,
          text: _text,
          existing: _existing,
          removedIds: removed,
          pendingFiles: pending,
          photoChanged: photoChanged,
          onProgress: _onProgress,
        );
        final reloaded = await _houseRepo.listHousePhotos(houseId);
        final display = reloaded.isNotEmpty ? reloaded : saved;
        if (!mounted) return;
        var message = display.isEmpty ? '保存完了' : '保存完了（写真 ${display.length} 枚）';
        var failed = false;
        if (expectedNew > 0 && display.isEmpty) {
          failed = true;
          message = '保存は完了しましたが、写真が登録されませんでした。ファイルを選び直して再度保存してください。';
        }
        setState(() {
          _existing = display;
          _removed.clear();
          _pending.clear();
          _saveStatus = failed ? _SaveStatus.error : _SaveStatus.success;
          _saveStatusMessage = message;
          _formError = failed ? message : null;
        });
        ToastScope.of(context).show(message, failed ? ToastKind.error : ToastKind.success);
      }
    } catch (error) {
      final message = messageForHouseFormSaveError(error);
      if (!mounted) return;
      setState(() {
        _formError = message;
        _saveStatus = _SaveStatus.error;
        _saveStatusMessage = message;
      });
      ToastScope.of(context).show(message, ToastKind.error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _onProgress(SaveProgressStep step, String? detail) {
    if (!mounted) return;
    setState(() => _saveStatusMessage = progressStepLabel(step, detail));
  }

  @override
  Widget build(BuildContext context) {
    final crumbs = [
      const PageCrumb('物件', to: '/landlord/houses'),
      PageCrumb(widget.isNew ? '新規登録' : '編集'),
    ];
    if (!FirebaseEnv.isConfigured) {
      return BindChrome(crumbs: crumbs, child: const Panel(child: Text('Firebase を設定してください。')));
    }
    final auth = AuthScope.of(context);
    if (auth.loading) {
      return BindChrome(crumbs: crumbs, child: const Panel(child: Text('認証状態を確認中…')));
    }
    if (auth.user == null) {
      return const BindChrome(child: Panel(child: Text('ログインが必要です。')));
    }
    if (!widget.isNew && _loading) {
      return BindChrome(crumbs: crumbs, child: const Panel(child: Text('読み込み中…')));
    }
    if (_loadError != null && !widget.isNew && !_loading) {
      return BindChrome(
        crumbs: crumbs,
        child: Panel(
          child: VStack(
            children: [
              ErrorText(_loadError!),
              Align(
                alignment: Alignment.centerLeft,
                child: AppButton(label: '物件へ', ghost: true, onPressed: () => context.go('/landlord/houses')),
              ),
            ],
          ),
        ),
      );
    }
    if (widget.isNew && _landlordsLoading) {
      return BindChrome(crumbs: crumbs, child: const Panel(child: Text('読み込み中…')));
    }
    if (widget.isNew && _landlords.isEmpty) {
      return BindChrome(
        crumbs: crumbs,
        child: Panel(
          child: VStack(
            children: [
              const Text('先に大家を登録してください。'),
              Align(
                alignment: Alignment.centerLeft,
                child: AppButton(label: '物件へ', ghost: true, onPressed: () => context.go('/landlord/houses')),
              ),
            ],
          ),
        ),
      );
    }

    final active = _activeExisting;
    return BindChrome(
      crumbs: crumbs,
      child: Panel(
        child: VStack(
          gap: 20,
          children: [
            VStack(
              children: [
                if (widget.isNew)
                  LabeledField(
                    label: '大家',
                    child: DropdownButtonFormField<String>(
                      key: ValueKey(_landlordId),
                      initialValue: _landlords.any((item) => item.id == _landlordId) ? _landlordId : '',
                      items: [
                        DropdownMenuItem(value: '', child: Text('選択してください', style: appText())),
                        for (final landlord in _landlords)
                          DropdownMenuItem(value: landlord.id, child: Text(landlord.name, style: appText())),
                      ],
                      onChanged: _saving ? null : (value) => setState(() => _landlordId = value ?? ''),
                    ),
                  ),
                LabeledField(
                  label: 'タイトル',
                  child: TextField(
                    controller: _title,
                    maxLines: 3,
                    maxLength: 200,
                    style: appText(),
                    decoration: const InputDecoration(hintText: 'Enter で改行できます', counterText: ''),
                  ),
                ),
                LabeledField(
                  label: '説明',
                  child: TextField(
                    controller: _description,
                    maxLines: 8,
                    maxLength: 8000,
                    style: appText(),
                    decoration: const InputDecoration(counterText: ''),
                  ),
                ),
                if (_addressError != null)
                  MutedText('住所候補の取得に失敗しました: $_addressError（手入力のまま保存できます）', small: true),
                HouseAddressFields(
                  prefecture: _prefecture,
                  city: _city,
                  town: _town,
                  prefectures: _prefList,
                  cities: _cityList,
                  towns: _townList,
                  loadingPrefectures: _loadingPrefs,
                  loadingTowns: _loadingTowns,
                  onPrefecture: (next) {
                    setState(() {
                      _prefecture = next;
                      _city = '';
                      _town = '';
                    });
                  },
                  onCity: (next) {
                    setState(() {
                      _city = next;
                      _town = '';
                    });
                    _ensureTowns();
                  },
                  onTown: (next) => setState(() => _town = next),
                ),
                if (_prefecture.isNotEmpty && _city.isNotEmpty && _townList.isEmpty && !_loadingTowns)
                  const MutedText('この市区町村には町字データがありません。町名は直接入力してください。', small: true),
                HousePropertyFormFields(
                  fields: _fields,
                  resetToken: _fieldsToken,
                  onChanged: (next) => setState(() => _fields = next),
                ),
                HouseFormPhotos(
                  existing: active,
                  pendingBytes: [for (final file in _pending) file.bytes],
                  saving: _saving,
                  onPick: _pickPhotos,
                  onRemoveExisting: (id) {
                    setState(() => _removed.add(id));
                    _resetStatus();
                  },
                  onRemovePending: (index) {
                    setState(() => _pending.removeAt(index));
                    _resetStatus();
                  },
                ),
                if (_saveStatus != _SaveStatus.idle) _statusBox(),
                if (_formError != null) ErrorText(_formError!),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    AppButton(label: _saving ? '保存中…' : '保存', primary: true, onPressed: _saving ? null : _save),
                    AppButton(label: 'キャンセル', ghost: true, onPressed: _saving ? null : () => context.go('/landlord/houses')),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusBox() {
    final (background, border, color) = switch (_saveStatus) {
      _SaveStatus.saving => (const Color(0xFFEFF6FF), const Color(0xFFBFDBFE), const Color(0xFF1D4ED8)),
      _SaveStatus.success => (const Color(0xFFF0FDF4), const Color(0xFFBBF7D0), const Color(0xFF15803D)),
      _SaveStatus.error => (const Color(0xFFFEF2F2), const Color(0xFFFECACA), AppColors.danger),
      _SaveStatus.idle => (Colors.transparent, Colors.transparent, AppColors.text),
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Text(_saveStatusMessage, style: appText(fontSize: 15.2, color: color)),
    );
  }
}

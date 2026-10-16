import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/admin_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/portal_label.dart';
import '../state/app_state.dart';
import '../state/scope.dart';
import '../theme/app_text.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/ui.dart';

class LandlordFormPage extends StatefulWidget {
  const LandlordFormPage({super.key, this.landlordId});

  final String? landlordId;

  bool get isNew => landlordId == null;

  @override
  State<LandlordFormPage> createState() => _LandlordFormPageState();
}

class _LandlordFormPageState extends State<LandlordFormPage> {
  AdminRepository? _repoField;
  AdminRepository get _repo => _repoField ??= AdminRepository();
  final _name = TextEditingController();
  final _url = TextEditingController();
  AdminCatalog? _catalog;
  bool _loading = false;
  String? _error;
  String? _missing;
  bool _loadStarted = false;

  @override
  void initState() {
    super.initState();
    _loading = !widget.isNew;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = AuthScope.of(context);
    if (widget.isNew || auth.loading || auth.user == null || _loadStarted) return;
    _loadStarted = true;
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _url.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = AuthScope.of(context).user;
    if (user == null) return;
    try {
      final catalog = await _repo.load(user.uid);
      if (!mounted) return;
      final landlord = catalog.landlords.where((item) => item.id == widget.landlordId).firstOrNull;
      setState(() {
        _catalog = catalog;
        _loading = false;
        _missing = landlord == null ? '大家が見つかりません。' : null;
        if (landlord != null && _name.text.isEmpty) _name.text = landlord.name;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _missing = firebaseErrorText(error, fallback: '読み込みに失敗しました。');
      });
    }
  }

  List<PageCrumb> get _crumbs => [
        const PageCrumb('大家', to: '/landlord/landlords'),
        PageCrumb(widget.isNew ? '新規登録' : '編集'),
      ];

  Future<void> _saveName() async {
    final trimmed = _name.text.trim();
    if (trimmed.isEmpty) {
      setState(() => _error = '名前を入力してください。');
      return;
    }
    final user = AuthScope.of(context).user;
    if (user == null) return;
    setState(() => _error = null);
    try {
      if (widget.isNew) {
        final id = await _repo.createLandlord(user.uid, trimmed);
        if (!mounted) return;
        ToastScope.of(context).show('大家を登録しました。', ToastKind.success);
        RefreshScope.of(context).bump();
        context.go('/landlord/landlords/$id');
        return;
      }
      await _repo.renameLandlord(widget.landlordId!, trimmed);
      if (!mounted) return;
      ToastScope.of(context).show('名前を保存しました。', ToastKind.success);
      RefreshScope.of(context).bump();
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = firebaseErrorText(error, fallback: '処理に失敗しました。'));
    }
  }

  Future<void> _addUrl() async {
    final landlordId = widget.landlordId;
    if (landlordId == null) return;
    final url = _url.text.trim();
    if (url.isEmpty) {
      setState(() => _error = 'URLを入力してください。');
      return;
    }
    setState(() => _error = null);
    try {
      await _repo.addPortalSource(landlordId, url);
      if (!mounted) return;
      _url.clear();
      ToastScope.of(context).show('URLを追加しました。', ToastKind.success);
      RefreshScope.of(context).bump();
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = firebaseErrorText(error, fallback: '処理に失敗しました。'));
    }
  }

  Future<void> _deleteUrl(String sourceId) async {
    final ok = await askConfirm(context, 'このURLと、そこから取り込んだ物件を削除しますか？');
    if (!ok || !mounted) return;
    setState(() => _error = null);
    try {
      await _repo.deletePortalSource(sourceId);
      if (!mounted) return;
      ToastScope.of(context).show('URLを削除しました。', ToastKind.success);
      RefreshScope.of(context).bump();
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = firebaseErrorText(error, fallback: '処理に失敗しました。'));
    }
  }

  Future<void> _deleteLandlord() async {
    final landlordId = widget.landlordId;
    if (landlordId == null) return;
    final ok = await askConfirm(context, '「${_name.text}」と、その物件・URLをすべて削除しますか？');
    if (!ok || !mounted) return;
    setState(() => _error = null);
    try {
      await _repo.deleteLandlord(landlordId);
      if (!mounted) return;
      ToastScope.of(context).show('大家を削除しました。', ToastKind.success);
      RefreshScope.of(context).bump();
      context.go('/landlord/landlords');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = firebaseErrorText(error, fallback: '処理に失敗しました。'));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isNew && _loading) {
      return BindChrome(crumbs: _crumbs, child: const Panel(child: Text('読み込み中…')));
    }
    if (_missing != null) {
      return BindChrome(crumbs: _crumbs, child: Panel(child: ErrorText(_missing!)));
    }
    final sources = (_catalog?.sources ?? const <BoardSource>[])
        .where((source) => source.landlordId == widget.landlordId)
        .toList();
    return BindChrome(
      crumbs: _crumbs,
      child: Panel(
        child: VStack(
          children: [
            LabeledField(
              label: '大家の名前',
              child: TextField(
                controller: _name,
                maxLength: 80,
                style: appText(),
                decoration: const InputDecoration(counterText: ''),
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: AppButton(label: '名前を保存', primary: true, onPressed: _saveName),
            ),
            if (!widget.isNew) ...[
              LabeledField(
                label: 'ポータル',
                child: DropdownButtonFormField<String>(
                  initialValue: 'jimoty',
                  items: [
                    DropdownMenuItem(value: 'jimoty', child: Text('ジモティー', style: appText())),
                  ],
                  onChanged: null,
                ),
              ),
              LabeledField(
                label: 'URL',
                child: TextField(
                  controller: _url,
                  keyboardType: TextInputType.url,
                  style: appText(),
                  decoration: const InputDecoration(hintText: 'https://jmty.jp/profiles/...'),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: AppButton(label: '追加', primary: true, onPressed: _addUrl),
              ),
              if (sources.isEmpty)
                const MutedText('URLはまだありません。')
              else
                VStack(
                  children: [
                    for (final source in sources)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(portalLabel(source.portal), style: appText(fontWeight: FontWeight.w700)),
                                MutedText(source.url, small: true),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          AppButton(label: 'このURLを削除', danger: true, onPressed: () => _deleteUrl(source.id)),
                        ],
                      ),
                  ],
                ),
              Align(
                alignment: Alignment.centerLeft,
                child: AppButton(label: '大家を削除', danger: true, onPressed: _deleteLandlord),
              ),
            ],
            if (_error != null) ErrorText(_error!),
          ],
        ),
      ),
    );
  }
}

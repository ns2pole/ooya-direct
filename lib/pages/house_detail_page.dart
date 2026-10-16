import 'package:flutter/material.dart';

import '../data/house_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../state/app_state.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/house_photo_grid.dart';
import '../widgets/house_property_table.dart';
import '../widgets/ui.dart';

class HouseDetailPage extends StatefulWidget {
  const HouseDetailPage({super.key, required this.houseId});

  final String houseId;

  @override
  State<HouseDetailPage> createState() => _HouseDetailPageState();
}

class _HouseDetailPageState extends State<HouseDetailPage> {
  final _repo = HouseRepository();
  final _inquiryKey = GlobalKey();
  final _messageFocus = FocusNode();
  final _message = TextEditingController();

  House? _house;
  List<String> _photos = const [];
  List<Inquiry> _inquiries = const [];
  bool _loading = true;
  String? _error;
  bool _missing = false;
  bool _submitting = false;
  String? _submitError;
  bool _submitOk = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _messageFocus.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!FirebaseEnv.isConfigured) {
      setState(() => _loading = false);
      return;
    }
    try {
      final record = await _repo.getPublicHouse(widget.houseId);
      if (!mounted) return;
      if (record == null) {
        setState(() {
          _missing = true;
          _loading = false;
        });
        return;
      }
      final photos = await _repo.loadHousePhotosForDisplay(widget.houseId, record.data);
      final inquiries = await _repo.listInquiries(widget.houseId);
      if (!mounted) return;
      setState(() {
        _house = record.house;
        _photos = photos.map((photo) => photo.url).where((url) => url.isNotEmpty).toList();
        _inquiries = inquiries;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = firebaseErrorText(error);
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    if (_message.text.trim().isEmpty) return;
    setState(() {
      _submitting = true;
      _submitError = null;
      _submitOk = false;
    });
    try {
      await _repo.submitInquiry(houseId: widget.houseId, message: _message.text);
      final inquiries = await _repo.listInquiries(widget.houseId);
      if (!mounted) return;
      setState(() {
        _message.clear();
        _inquiries = inquiries;
        _submitOk = true;
        _submitting = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitError = firebaseErrorText(error, fallback: '送信に失敗しました。');
        _submitting = false;
      });
    }
  }

  void _focusInquiry() {
    final target = _inquiryKey.currentContext;
    if (target != null) {
      Scrollable.ensureVisible(target, alignment: 0.05, duration: const Duration(milliseconds: 280));
    }
    _messageFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final crumbs = _loading
        ? const [PageCrumb('物件詳細')]
        : _house == null
            ? const [PageCrumb('物件が見つかりません')]
            : const <PageCrumb>[];
    final action = _house == null
        ? null
        : PageEndAction(label: '問い合わせ', onPressed: _focusInquiry);
    return BindChrome(
      crumbs: crumbs,
      endAction: action,
      child: _body(),
    );
  }

  Widget _body() {
    if (!FirebaseEnv.isConfigured) {
      return const Panel(
        child: VStack(
          children: [
            Text('Firebase を設定してください。'),
            AppLink(label: '物件一覧へ', to: '/'),
          ],
        ),
      );
    }
    if (_loading) return const Panel(child: Text('読み込み中…'));
    if (_error != null) {
      return Panel(
        child: VStack(
          children: [
            ErrorText(_error!),
            const AppLink(label: '物件一覧へ', to: '/'),
          ],
        ),
      );
    }
    final house = _house;
    if (house == null || _missing) {
      return const Panel(child: AppLink(label: '物件一覧へ', to: '/'));
    }
    final title = house.title.trim().isEmpty ? '（無題）' : house.title.trim();
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Expanded(child: Text(title, style: appText(fontSize: 15.2, fontWeight: FontWeight.w600))),
              const SizedBox(width: 12),
              Text('掲載: ${formatDateOnly(house.createdAt)}', style: appText(fontSize: 14, color: AppColors.muted)),
            ],
          ),
          if (_photos.isNotEmpty) HousePhotoGrid(photos: _photos, title: house.title),
          const SizedBox(height: 12),
          house.description.trim().isEmpty
              ? const MutedText('説明文はありません。')
              : Text(house.description, style: appText()),
          const SizedBox(height: 20),
          VStack(
            gap: 20,
            children: [
              VStack(
                children: [
                  LabeledField(
                    label: 'メッセージ',
                    emphasis: true,
                    child: TextField(
                      key: _inquiryKey,
                      focusNode: _messageFocus,
                      controller: _message,
                      minLines: 5,
                      maxLines: 8,
                      maxLength: 2000,
                      buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
                      decoration: const InputDecoration(),
                    ),
                  ),
                  if (_submitError != null) ErrorText(_submitError!),
                  if (_submitOk) const SuccessText('送信しました。'),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: AppButton(
                      label: _submitting ? '送信中…' : '送信',
                      primary: true,
                      onPressed: _submitting ? null : _submit,
                    ),
                  ),
                ],
              ),
              const MutedText('下記の問い合わせ板は誰でも閲覧可能です。個人情報の記載にはご配慮下さい。', small: true),
              if (_inquiries.isEmpty)
                const MutedText('まだ問い合わせはありません。')
              else
                VStack(
                  gap: 12,
                  children: [
                    for (final inquiry in _inquiries) _InquiryCard(inquiry: inquiry),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InquiryCard extends StatelessWidget {
  const _InquiryCard({required this.inquiry});

  final Inquiry inquiry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.4, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: Text(formatDate(inquiry.createdAt), style: appText(fontSize: 14.4, color: AppColors.muted)),
          ),
          const SizedBox(height: 5.6),
          Text(inquiry.message, style: appText()),
        ],
      ),
    );
  }
}

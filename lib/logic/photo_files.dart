const maxHousePhotos = 20;
const maxImageBytes = 5 * 1024 * 1024;

const _imageExtensions = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'};

String imageFileHint() => 'JPEG / PNG / GIF / WebP / HEIC';

String? fileExtension(String name) {
  final dot = name.lastIndexOf('.');
  if (dot < 0 || dot == name.length - 1) return null;
  return name.substring(dot + 1).toLowerCase();
}

bool isAllowedImageFile({required String name, String? mimeType}) {
  if (mimeType != null && mimeType.startsWith('image/')) return true;
  final ext = fileExtension(name);
  return ext != null && _imageExtensions.contains(ext);
}

String? validatePhotoFile({required String name, required int size, String? mimeType}) {
  if (!isAllowedImageFile(name: name, mimeType: mimeType)) {
    return '画像ファイル（${imageFileHint()}）を選んでください。';
  }
  if (size > maxImageBytes) return '画像は 5MB 以下にしてください。';
  return null;
}

String? photoSelectionError({
  required int existingCount,
  required int pendingCount,
  required List<({String name, int size, String? mimeType})> files,
}) {
  for (final file in files) {
    final error = validatePhotoFile(name: file.name, size: file.size, mimeType: file.mimeType);
    if (error != null) return error;
  }
  if (existingCount + pendingCount + files.length > maxHousePhotos) {
    return '写真は最大 $maxHousePhotos 枚までです。';
  }
  return null;
}

String photoExtension(String name) {
  final ext = fileExtension(name);
  return ext != null && _imageExtensions.contains(ext) ? ext : 'jpg';
}

String photoContentType(String name, String? mimeType) {
  if (mimeType != null && mimeType.startsWith('image/')) return mimeType;
  final ext = photoExtension(name);
  return 'image/${ext == 'jpg' ? 'jpeg' : ext}';
}

enum SaveProgressStep { upload, photos, house }

String progressStepLabel(SaveProgressStep step, [String? detail]) {
  switch (step) {
    case SaveProgressStep.upload:
      return detail == null ? '画像をアップロード中…' : '画像をアップロード中…（$detail）';
    case SaveProgressStep.photos:
      return detail == null ? 'photos へ保存中…' : 'photos へ保存中…（$detail）';
    case SaveProgressStep.house:
      return '物件情報を保存中…';
  }
}

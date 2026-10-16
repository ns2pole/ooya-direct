String portalLabel(String portal) => portal == 'jimoty' ? 'ジモティー' : portal;

String portalLabelForHouse({
  required bool fromSync,
  required String sourceId,
  required List<({String id, String portal})> sources,
}) {
  if (!fromSync) return 'ポータルなし';
  for (final source in sources) {
    if (source.id == sourceId) return portalLabel(source.portal);
  }
  return 'ポータルなし';
}

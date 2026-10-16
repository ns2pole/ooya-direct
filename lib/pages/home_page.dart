import 'package:flutter/material.dart';

import '../data/house_repository.dart';
import '../firebase/firebase_env.dart';
import '../logic/house.dart';
import '../state/app_state.dart';
import '../widgets/bind_chrome.dart';
import '../widgets/house_list_carousel.dart';
import '../widgets/ui.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _repo = HouseRepository();
  late final Future<List<House>> _houses = _load();
  ListProgress? _progress;

  Future<List<House>> _load() {
    if (!FirebaseEnv.isConfigured) return Future.value(const []);
    return _repo.listPublicHouses();
  }

  @override
  Widget build(BuildContext context) {
    if (!FirebaseEnv.isConfigured) {
      return const BindChrome(
        child: Panel(child: Text('Firebase を設定すると一覧が表示されます。')),
      );
    }
    return BindChrome(
      listProgress: _progress,
      child: FutureBuilder<List<House>>(
        future: _houses,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Panel(child: Text('読み込み中…'));
          }
          if (snapshot.hasError) {
            return Panel(child: ErrorText(firebaseErrorText(snapshot.error!)));
          }
          final houses = snapshot.data ?? const <House>[];
          if (houses.isEmpty) {
            return const Panel(
              child: VStack(
                children: [
                  Text('まだ物件がありません。'),
                  MutedText('大家さんから登録されるとここに表示されます。'),
                ],
              ),
            );
          }
          return Panel(
            child: HouseListCarousel(
              houses: houses,
              loadPhotoUrls: _repo.listPhotoUrls,
              onProgress: (next) {
                if (next == _progress) return;
                setState(() => _progress = next);
              },
            ),
          );
        },
      ),
    );
  }
}

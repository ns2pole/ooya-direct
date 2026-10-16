import 'package:flutter/widgets.dart';

import 'app.dart';
import 'firebase/firebase_env.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FirebaseEnv.init();
  runApp(const OoyaApp());
}

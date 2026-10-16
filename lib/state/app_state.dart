import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../firebase/firebase_env.dart';

class PageCrumb {
  const PageCrumb(this.label, {this.to});

  final String label;
  final String? to;

  @override
  bool operator ==(Object other) => other is PageCrumb && other.label == label && other.to == to;

  @override
  int get hashCode => Object.hash(label, to);
}

class PageEndAction {
  const PageEndAction({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;
}

class ListProgress {
  const ListProgress({required this.current, required this.total, required this.listedDate});

  final int current;
  final int total;
  final String listedDate;

  @override
  bool operator ==(Object other) {
    return other is ListProgress &&
        other.current == current &&
        other.total == total &&
        other.listedDate == listedDate;
  }

  @override
  int get hashCode => Object.hash(current, total, listedDate);
}

class PageChrome extends ChangeNotifier {
  List<PageCrumb> crumbs = const [];
  PageEndAction? endAction;
  ListProgress? listProgress;
  int _generation = 0;

  int bind() => ++_generation;

  void apply(
    int token, {
    required List<PageCrumb> crumbs,
    PageEndAction? endAction,
    ListProgress? listProgress,
  }) {
    if (token != _generation) return;
    final same = listEquals(this.crumbs, crumbs) &&
        this.endAction?.label == endAction?.label &&
        this.listProgress == listProgress;
    this.endAction = endAction;
    if (same) return;
    this.crumbs = crumbs;
    this.listProgress = listProgress;
    notifyListeners();
  }

  void release(int? token) {
    if (token == null || token != _generation) return;
    crumbs = const [];
    endAction = null;
    listProgress = null;
    notifyListeners();
  }
}

enum ToastKind { success, error }

class ToastMessage {
  const ToastMessage(this.text, this.kind);

  final String text;
  final ToastKind kind;
}

class ToastController extends ChangeNotifier {
  ToastMessage? current;
  Timer? _timer;

  void show(String text, ToastKind kind) {
    current = ToastMessage(text, kind);
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 4000), () {
      current = null;
      notifyListeners();
    });
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

class AdminRefresh extends ChangeNotifier {
  int version = 0;

  void bump() {
    version += 1;
    notifyListeners();
  }
}

class AuthController extends ChangeNotifier {
  AuthController({this._auth}) {
    if (!FirebaseEnv.isConfigured) {
      loading = false;
      return;
    }
    _sub = (_auth ?? FirebaseAuth.instance).authStateChanges().listen((next) {
      user = next;
      loading = false;
      notifyListeners();
    });
  }

  final FirebaseAuth? _auth;
  StreamSubscription<User?>? _sub;
  User? user;
  bool loading = true;

  Future<void> signIn(String email, String password) {
    return (_auth ?? FirebaseAuth.instance).signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> signOut() => (_auth ?? FirebaseAuth.instance).signOut();

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

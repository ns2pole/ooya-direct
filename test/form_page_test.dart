import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ooya_direct/logic/house.dart';
import 'package:ooya_direct/pages/house_form_page.dart';
import 'package:ooya_direct/pages/landlord_form_page.dart';
import 'package:ooya_direct/state/app_state.dart';
import 'package:ooya_direct/state/scope.dart';
import 'package:ooya_direct/theme/app_theme.dart';
import 'package:ooya_direct/widgets/house_property_form_fields.dart';

void main() {
  Widget wrap(Widget child) {
    final auth = AuthController();
    return MaterialApp(
      theme: buildAppTheme(),
      home: Scaffold(
        body: SingleChildScrollView(
          child: AuthScope(
            auth: auth,
            child: ChromeScope(
              chrome: PageChrome(),
              child: ToastScope(
                toast: ToastController(),
                child: RefreshScope(refresh: AdminRefresh(), child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('大家の新規は名前の保存だけ出す', (tester) async {
    await tester.pumpWidget(wrap(const LandlordFormPage()));
    await tester.pump();
    expect(find.text('大家の名前'), findsOneWidget);
    expect(find.text('名前を保存'), findsOneWidget);
    expect(find.text('このURLを削除'), findsNothing);
    expect(find.text('大家を削除'), findsNothing);
  });

  testWidgets('物件の項目が家賃から参考リンクまで並ぶ', (tester) async {
    await tester.pumpWidget(
      wrap(
        HousePropertyFormFields(
          fields: HousePropertyFields.empty,
          resetToken: 0,
          onChanged: (_) {},
        ),
      ),
    );
    await tester.pump();
    expect(find.text('家賃'), findsOneWidget);
    expect(find.text('管理費等'), findsOneWidget);
    expect(find.text('ジャンル'), findsOneWidget);
    expect(find.text('間取り'), findsOneWidget);
    expect(find.text('参考リンク'), findsOneWidget);
    await tester.tap(find.text('任意').first);
    await tester.pumpAndSettle();
    expect(find.text('マンション'), findsOneWidget);
    await tester.tap(find.text('マンション').last);
    await tester.pumpAndSettle();
  });

  testWidgets('Firebase 未設定の物件フォームは設定を求める', (tester) async {
    await tester.pumpWidget(wrap(const HouseFormPage()));
    await tester.pump();
    expect(find.text('Firebase を設定してください。'), findsOneWidget);
  });
}

import 'package:go_router/go_router.dart';

import '../logic/house.dart';
import '../pages/admin_houses_page.dart';
import '../pages/admin_landlords_page.dart';
import '../pages/admin_line_page.dart';
import '../pages/home_page.dart';
import '../pages/house_detail_page.dart';
import '../pages/house_form_page.dart';
import '../pages/landlord_form_page.dart';
import '../pages/login_page.dart';
import '../state/app_state.dart';
import '../widgets/app_shell.dart';

GoRouter createRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      if (auth.loading) return null;
      final path = state.uri.path;
      final loggedIn = auth.user != null;
      final landlord = path == '/landlord' || path.startsWith('/landlord/');
      if (!loggedIn && landlord && path != '/landlord') return '/landlord';
      if (loggedIn && path == '/landlord') return '/landlord/houses';
      return null;
    },
    errorBuilder: (context, state) => const HomePage(),
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(path: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomePage()),
          GoRoute(
            path: '/houses/:houseId',
            builder: (context, state) => HouseDetailPage(houseId: state.pathParameters['houseId']!),
          ),
          GoRoute(path: '/landlord', builder: (context, state) => const LoginPage()),
          GoRoute(path: '/landlord/houses', builder: (context, state) => const AdminHousesPage()),
          GoRoute(
            path: '/landlord/houses/new',
            builder: (context, state) => HouseFormPage(initialLandlordId: state.uri.queryParameters['landlord']),
          ),
          GoRoute(
            path: '/landlord/houses/:houseId/edit',
            builder: (context, state) {
              final extra = state.extra;
              return HouseFormPage(
                houseId: state.pathParameters['houseId'],
                photosAfterSave: extra is List<HousePhoto> ? extra : null,
              );
            },
          ),
          GoRoute(path: '/landlord/landlords', builder: (context, state) => const AdminLandlordsPage()),
          GoRoute(
            path: '/landlord/landlords/new',
            builder: (context, state) => const LandlordFormPage(),
          ),
          GoRoute(
            path: '/landlord/landlords/:landlordId',
            builder: (context, state) => LandlordFormPage(landlordId: state.pathParameters['landlordId']),
          ),
          GoRoute(path: '/landlord/line', builder: (context, state) => const AdminLinePage()),
        ],
      ),
    ],
  );
}

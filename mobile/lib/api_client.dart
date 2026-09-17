import 'package:http/http.dart' as client;
import 'config.dart';
export 'package:http/http.dart' show Response;

class Session {
  static String? token;
}

Map<String, String> _headers(Uri url, Map<String, String>? headers) {
  final result = <String, String>{...?headers};
  final api = Uri.parse(AppConfig.apiBaseUrl);
  if (url.origin == api.origin && url.path.startsWith('${api.path}/api/')) {
    final token = Session.token;
    if (token != null) result.putIfAbsent('Authorization', () => 'Bearer $token');
  }
  return result;
}

Future<client.Response> get(Uri url, {Map<String, String>? headers}) => client.get(url, headers: _headers(url, headers)).timeout(const Duration(seconds: 30));
Future<client.Response> post(Uri url, {Map<String, String>? headers, Object? body}) => client.post(url, headers: _headers(url, headers), body: body).timeout(const Duration(seconds: 60));
Future<client.Response> put(Uri url, {Map<String, String>? headers, Object? body}) => client.put(url, headers: _headers(url, headers), body: body).timeout(const Duration(seconds: 30));
Future<client.Response> delete(Uri url, {Map<String, String>? headers, Object? body}) => client.delete(url, headers: _headers(url, headers), body: body).timeout(const Duration(seconds: 30));

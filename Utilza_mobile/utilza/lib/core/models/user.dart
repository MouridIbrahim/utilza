import '../utils/json_helpers.dart';

/// Backend `user` object. No role field exists; admin is server-determined.
class PublicUser {
  const PublicUser({
    required this.id,
    required this.email,
    this.name,
  });

  final String id;
  final String email;
  final String? name;

  factory PublicUser.fromJson(Map<String, dynamic> json) {
    return PublicUser(
      id: stringOf(json, 'id'),
      email: stringOf(json, 'email'),
      name: nullableStringOf(json, 'name'),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
      };
}

/// Login/register payload result: `{user, token}`.
class AuthResult {
  const AuthResult({required this.user, required this.token});

  final PublicUser user;
  final String token;

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'];
    return AuthResult(
      user: PublicUser.fromJson(
        userJson is Map<String, dynamic> ? userJson : <String, dynamic>{},
      ),
      token: stringOf(json, 'token'),
    );
  }
}

import 'package:supabase_flutter/supabase_flutter.dart';

class PaymentOrder {
  final String id;
  final String user_id;
  final double amount;
  final String currency;
  final String method;
  final String status;
  final String? description;
  final DateTime created_at;

  const PaymentOrder({
    required this.id?,
    required this.user_id?,
    required this.amount?,
    required this.currency?,
    required this.method?,
    required this.status?,
    this.description,
    required this.created_at?,
  });

  factory PaymentOrder.fromJson(Map<String, dynamic> json) => PaymentOrder(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String,
      method: json['method'] as String,
      status: json['status'] as String,
      description: json['description'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'amount': amount,
      'currency': currency,
      'method': method,
      'status': status,
      'description': description,
      'created_at': created_at.toIso8601String(),
  };
}

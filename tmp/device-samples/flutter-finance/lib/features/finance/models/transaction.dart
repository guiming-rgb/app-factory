/// 记账 — 交易模型，对标随手记/挖财
class Transaction {
  final String id;
  final String userId;
  final double amount;
  final String category; // 餐饮/交通/购物/娱乐/住房/医疗/教育/工资/投资/其他
  final String type; // income / expense
  final String? note;
  final String? accountId;
  final DateTime createdAt;

  Transaction({
    required this.id,
    required this.userId,
    required this.amount,
    required this.category,
    required this.type,
    this.note,
    this.accountId,
    required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
    id: json['id'] as String,
    userId: json['user_id'] as String? ?? '',
    amount: (json['amount'] as num).toDouble(),
    category: json['category'] as String? ?? '其他',
    type: json['type'] as String? ?? 'expense',
    note: json['note'] as String?,
    accountId: json['account_id'] as String?,
    createdAt: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
    'user_id': userId,
    'amount': amount,
    'category': category,
    'type': type,
    'note': note,
    'account_id': accountId,
  };

  bool get isIncome => type == 'income';

  static const categories = ['餐饮','交通','购物','娱乐','住房','医疗','教育','工资','投资','其他'];
  static const incomeCategories = ['工资','投资','兼职','奖金','报销','其他'];
}

class Budget {
  final String id;
  final String category;
  final double limit;
  final String period; // monthly / yearly

  Budget({required this.id, required this.category, required this.limit, this.period = 'monthly'});

  factory Budget.fromJson(Map<String, dynamic> json) => Budget(
    id: json['id'] as String,
    category: json['category'] as String? ?? '其他',
    limit: (json['limit_amount'] as num?)?.toDouble() ?? 0,
    period: json['period'] as String? ?? 'monthly',
  );
}

class Account {
  final String id;
  final String name;
  final double balance;
  final String type; // cash / bank / credit / alipay / wechat

  Account({required this.id, required this.name, required this.balance, this.type = 'cash'});

  factory Account.fromJson(Map<String, dynamic> json) => Account(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    balance: (json['balance'] as num?)?.toDouble() ?? 0,
    type: json['type'] as String? ?? 'cash',
  );

  static const types = ['现金','银行卡','信用卡','支付宝','微信'];
}

/// CRM — 客户/商机/活动模型，对标 Salesforce Essentials / HubSpot
class Contact {
  final String id;
  final String userId;
  final String name;
  final String? company;
  final String? title;
  final String? phone;
  final String? email;
  final String? source; // 官网/转介绍/广告/展会/其他
  final String stage; // 线索→接触→需求→报价→谈判→成交→丢失
  final double? dealValue;
  final DateTime? expectedClose;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  Contact({
    required this.id, required this.userId, required this.name,
    this.company, this.title, this.phone, this.email,
    this.source, this.stage = "线索", this.dealValue,
    this.expectedClose, this.notes,
    required this.createdAt, required this.updatedAt,
  });

  factory Contact.fromJson(Map<String, dynamic> json) => Contact(
    id: json['id'] as String, userId: json['user_id'] as String? ?? '',
    name: json['name'] as String? ?? '', company: json['company'] as String?,
    title: json['title'] as String?, phone: json['phone'] as String?,
    email: json['email'] as String?, source: json['source'] as String?,
    stage: json['stage'] as String? ?? '线索', dealValue: (json['deal_value'] as num?)?.toDouble(),
    expectedClose: json['expected_close'] != null ? DateTime.parse(json['expected_close'] as String) : null,
    notes: json['notes'] as String?,
    createdAt: DateTime.parse(json['created_at'] as String),
    updatedAt: DateTime.parse(json['updated_at'] as String),
  );

  Map<String, dynamic> toJson() => {
    'user_id': userId, 'name': name, 'company': company, 'title': title,
    'phone': phone, 'email': email, 'source': source, 'stage': stage,
    'deal_value': dealValue,
    'expected_close': expectedClose?.toIso8601String(),
    'notes': notes,
  };

  static const stages = ['线索','接触','需求','报价','谈判','成交','丢失'];
  static const stageColors = {0:0xFF3B82F6, 1:0xFF06B6D4, 2:0xFFF59E0B, 3:0xFFD97706, 4:0xFFDC2626, 5:0xFF10B981, 6:0xFF6B7280};
}

class Activity {
  final String id;
  final String contactId;
  final String type; // call / meeting / email / note
  final String title;
  final String? description;
  final DateTime time;

  Activity({required this.id, required this.contactId, required this.type, required this.title, this.description, required this.time});

  factory Activity.fromJson(Map<String, dynamic> json) => Activity(
    id: json['id'] as String, contactId: json['contact_id'] as String? ?? '',
    type: json['type'] as String? ?? 'note', title: json['title'] as String? ?? '',
    description: json['description'] as String?, time: DateTime.parse(json['created_at'] as String),
  );
}

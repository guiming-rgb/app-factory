import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ContactDetailPage extends StatelessWidget {
  final Map<String,dynamic> item;
  const ContactDetailPage({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text((item['name']??item['title']??'').toString())),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        ...item.entries.where((e) => e.value != null && e.key != 'user_id').map((e) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(e.key.replaceAll('_',' '), style: AppTheme.caption(Theme.of(context).textTheme)),
            const SizedBox(height: 4),
            Text(e.value.toString(), style: AppTheme.bodyText(Theme.of(context).textTheme)),
          ]),
        )),
      ]),
    );
  }
}

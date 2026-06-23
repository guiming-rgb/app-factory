import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/polished_widgets.dart';

class ArticleListPage extends StatefulWidget {
  const ArticleListPage({super.key});
  @override
  State<ArticleListPage> createState() => _ArticleListPageState();
}

class _ArticleListPageState extends State<ArticleListPage> {
  final _searchCtrl = TextEditingController();
  List<Map<String,dynamic>> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Future<void> _load([String? search]) async {
    setState(() { _loading = true; _error = null; });
    try {
      var q = Supabase.instance.client.from("articles").select("*").order("created_at",ascending:false).limit(50);
      if (search != null && search.isNotEmpty) q = q.ilike("name", "%$search%");
      final rows = await q;
      setState(() { _items = List<Map<String,dynamic>>.from(rows as List); _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Article")),
      body: Column(children: [
        AppSearchBar(controller: _searchCtrl, onChanged: (v) => _load(v)),
        Expanded(child: _loading ? const AppLoadingSkeleton() :
          _error != null ? AppErrorCard(message: _error!, onRetry: () => _load()) :
          _items.isEmpty ? const AppEmptyState(icon: Icons.inbox, title: "暂无数据", subtitle: "点击右下角 + 添加") :
          RefreshIndicator(onRefresh: () => _load(), child: ListView.builder(
            itemCount: _items.length, itemBuilder: (_, i) {
              final item = _items[i];
              return Card(child: ListTile(
                title: Text((item['name']??item['title']??item['id']??'').toString()),
                subtitle: Text(item['created_at']?.toString()??''),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ArticleDetailPage(item: item))),
              ));
            }
          )),
        ),
      ]),
      floatingActionButton: FloatingActionButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ArticleFormPage())).then((_) => _load()), child: const Icon(Icons.add)),
    );
  }
}

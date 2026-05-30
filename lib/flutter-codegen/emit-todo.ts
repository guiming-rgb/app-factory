/** Flutter 待办列表页（本地 MVP + SharedPreferences 持久化） */
export function emitTodoListPageDart(displayName: string): string {
  const title = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `import "dart:convert";

import "package:flutter/material.dart";
import "package:shared_preferences/shared_preferences.dart";

class TodoListPage extends StatefulWidget {
  const TodoListPage({super.key});

  @override
  State<TodoListPage> createState() => _TodoListPageState();
}

class _TodoListPageState extends State<TodoListPage> {
  static const _storageKey = "app_factory_todos_v1";
  final TextEditingController _controller = TextEditingController();
  List<_TodoItem> _items = [
    const _TodoItem(id: 1, title: "示例：买牛奶", done: false),
  ];
  int _nextId = 2;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadTodos();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadTodos() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        final items = <_TodoItem>[];
        var maxId = 1;
        for (final row in list) {
          if (row is! Map) continue;
          final id = (row["id"] is int)
              ? row["id"] as int
              : int.tryParse("\${row['id']}") ?? maxId;
          final t = row["title"]?.toString() ?? "";
          if (t.isEmpty) continue;
          final done = row["done"] == true;
          items.add(_TodoItem(id: id, title: t, done: done));
          if (id >= maxId) maxId = id + 1;
        }
        if (items.isNotEmpty) {
          setState(() {
            _items = items;
            _nextId = maxId;
            _loaded = true;
          });
          return;
        }
      } catch (_) {
        /* 使用默认示例 */
      }
    }
    setState(() => _loaded = true);
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = _items
        .map((e) => {"id": e.id, "title": e.title, "done": e.done})
        .toList();
    await prefs.setString(_storageKey, jsonEncode(payload));
  }

  void _addTodo() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _items.add(_TodoItem(id: _nextId, title: text, done: false));
      _nextId++;
      _controller.clear();
    });
    void persist() => _persist();
    persist();
  }

  void _toggle(int id) {
    setState(() {
      final i = _items.indexWhere((e) => e.id == id);
      if (i < 0) return;
      final cur = _items[i];
      _items[i] = _TodoItem(id: cur.id, title: cur.title, done: !cur.done);
    });
    void persist() => _persist();
    persist();
  }

  void _delete(int id) {
    setState(() => _items.removeWhere((e) => e.id == id));
    void persist() => _persist();
    persist();
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) {
      return Scaffold(
        appBar: AppBar(title: const Text("${title}")),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              "本地待办 · 添加 / 完成 / 删除 · 已持久化",
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.black54,
                  ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: "输入新任务…",
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _addTodo(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(onPressed: _addTodo, child: const Text("添加")),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _items.isEmpty
                ? const Center(child: Text("暂无任务，请在上方添加"))
                : ListView.builder(
                    itemCount: _items.length,
                    itemBuilder: (context, index) {
                      final item = _items[index];
                      return ListTile(
                        leading: Checkbox(
                          value: item.done,
                          onChanged: (_) => _toggle(item.id),
                        ),
                        title: Text(
                          item.title,
                          style: TextStyle(
                            decoration: item.done
                                ? TextDecoration.lineThrough
                                : null,
                            color: item.done ? Colors.grey : null,
                          ),
                        ),
                        onTap: () => _toggle(item.id),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _delete(item.id),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _TodoItem {
  const _TodoItem({
    required this.id,
    required this.title,
    required this.done,
  });

  final int id;
  final String title;
  final bool done;
}
`;
}

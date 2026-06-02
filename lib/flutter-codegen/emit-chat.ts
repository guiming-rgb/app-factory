/**
 * Flutter IM/聊天 页面生成 — Supabase Realtime
 * 无需第三方 SDK，利用 Supabase 内置 WebSocket 订阅
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

function pascalCase(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/** 聊天室列表页 */
export function emitFlutterChatListPage(displayName: string): string {
  const name = esc(displayName);
  return `import "package:flutter/material.dart";

import "package:supabase_flutter/supabase_flutter.dart";

class _Room {
  final String id;
  final String name;
  final String lastMessage;
  final int unread;
  const _Room({required this.id, required this.name, required this.lastMessage, this.unread = 0});
}

class ChatListPage extends StatefulWidget {
  const ChatListPage({super.key});

  @override
  State<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends State<ChatListPage> {
  List<_Room> _rooms = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRooms();
  }

  Future<void> _loadRooms() async {
    try {
      final client = Supabase.instance.client;
      final data = await client.from("chat_rooms").select("id, name, last_message, updated_at").order("updated_at", ascending: false).limit(30);
      final list = (data as List<dynamic>?) ?? [];
      setState(() {
        _rooms = list.map((item) {
          final m = item as Map<String, dynamic>;
          return _Room(id: m["id"]?.toString() ?? "", name: m["name"]?.toString() ?? "聊天", lastMessage: m["last_message"]?.toString() ?? "");
        }).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _rooms = [const _Room(id: "demo", name: "演示聊天室", lastMessage: "欢迎使用 ${name} 聊天功能")];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("消息")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _rooms.isEmpty
              ? const Center(child: Text("暂无聊天", style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  itemCount: _rooms.length,
                  itemBuilder: (_, i) {
                    final room = _rooms[i];
                    return ListTile(
                      leading: CircleAvatar(child: Text(room.name.isNotEmpty ? room.name[0] : "?")),
                      title: Text(room.name),
                      subtitle: Text(room.lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey)),
                      trailing: room.unread > 0 ? Badge(label: Text("\${room.unread}")) : null,
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => ChatRoomPage(roomId: room.id, roomName: room.name),
                      )),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NewChatPage())),
        child: const Icon(Icons.add),
      ),
    );
  }
}
`;
}

/** 聊天室详情页 — Supabase Realtime 订阅 */
export function emitFlutterChatRoomPage(): string {
  return `import "package:flutter/material.dart";

import "package:supabase_flutter/supabase_flutter.dart";

class ChatRoomPage extends StatefulWidget {
  const ChatRoomPage({super.key, required this.roomId, required this.roomName});
  final String roomId;
  final String roomName;

  @override
  State<ChatRoomPage> createState() => _ChatRoomPageState();
}

class _ChatRoomPageState extends State<ChatRoomPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<_Message> _messages = [];
  bool _loading = true;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final client = Supabase.instance.client;
      final data = await client.from("chat_messages").select("id, user_id, content, created_at").eq("room_id", widget.roomId).order("created_at", ascending: true).limit(100);
      final list = (data as List<dynamic>?) ?? [];
      setState(() {
        _messages.clear();
        _messages.addAll(list.map((item) {
          final m = item as Map<String, dynamic>;
          return _Message(id: m["id"]?.toString() ?? "", userId: m["user_id"]?.toString() ?? "", content: m["content"]?.toString() ?? "", createdAt: m["created_at"]?.toString() ?? "");
        }));
        _loading = false;
      });
      _scrollToBottom();
    } catch (_) {
      setState(() { _loading = false; });
    }
  }

  void _subscribeRealtime() {
    try {
      final client = Supabase.instance.client;
      _channel = client.channel("room_\${widget.roomId}");
      _channel!.onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: "public",
        table: "chat_messages",
        filter: PostgresChangeFilter.equal("room_id", widget.roomId),
        callback: (payload) {
          if (!mounted) return;
          final record = payload.newRecord;
          setState(() {
            _messages.add(_Message(
              id: record["id"]?.toString() ?? "",
              userId: record["user_id"]?.toString() ?? "",
              content: record["content"]?.toString() ?? "",
              createdAt: record["created_at"]?.toString() ?? "",
            ));
          });
          _scrollToBottom();
        },
      );
      _channel!.subscribe();
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _controller.clear();
    try {
      final client = Supabase.instance.client;
      await client.from("chat_messages").insert({"room_id": widget.roomId, "content": text});
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("发送失败：\$e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.roomName)),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const Center(child: Text("暂无消息，发送第一条吧", style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        controller: _scrollController,
                        itemCount: _messages.length,
                        padding: const EdgeInsets.all(12),
                        itemBuilder: (_, i) {
                          final msg = _messages[i];
                          final isMe = msg.userId == "me";
                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isMe ? Colors.teal.shade100 : Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(msg.content, style: const TextStyle(fontSize: 15)),
                            ),
                          );
                        },
                      ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(hintText: "输入消息…", border: OutlineInputBorder(), isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(onPressed: _sendMessage, icon: const Icon(Icons.send)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Message {
  final String id;
  final String userId;
  final String content;
  final String createdAt;
  const _Message({required this.id, required this.userId, required this.content, required this.createdAt});
}

class NewChatPage extends StatefulWidget {
  const NewChatPage({super.key});

  @override
  State<NewChatPage> createState() => _NewChatPageState();
}

class _NewChatPageState extends State<NewChatPage> {
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    try {
      final client = Supabase.instance.client;
      await client.from("chat_rooms").insert({"name": name});
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("创建失败：\$e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("新建聊天")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: "聊天室名称", border: OutlineInputBorder())),
            const SizedBox(height: 16),
            FilledButton(onPressed: _create, child: const Text("创建")),
          ],
        ),
      ),
    );
  }
}
`;
}

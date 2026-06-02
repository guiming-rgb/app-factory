/**
 * P1: Flutter 视频播放器模板
 */

export function emitFlutterVideoPlayerPage(displayName: string): string {
  const name = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
  return `import "package:flutter/material.dart";
import "package:video_player/video_player.dart";

/// 视频播放器页面
/// 依赖: video_player
class VideoPlayerPage extends StatefulWidget {
  const VideoPlayerPage({super.key, this.url});

  final String? url;

  @override
  State<VideoPlayerPage> createState() => _VideoPlayerPageState();
}

class _VideoPlayerPageState extends State<VideoPlayerPage> {
  late VideoPlayerController _controller;
  bool _initialized = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    try {
      final url = widget.url ?? "https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4";
      _controller = VideoPlayerController.networkUrl(Uri.parse(url));
      await _controller.initialize();
      if (mounted) setState(() => _initialized = true);
    } catch (e) {
      if (mounted) setState(() => _error = "视频加载失败：\$e");
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Scaffold(appBar: AppBar(title: const Text("视频")), body: Center(child: Text(_error!, style: const TextStyle(color: Colors.red))));
    if (!_initialized) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(title: const Text("${name}")),
      body: Column(
        children: [
          AspectRatio(aspectRatio: _controller.value.aspectRatio, child: VideoPlayer(_controller)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            IconButton(icon: Icon(_controller.value.isPlaying ? Icons.pause : Icons.play_arrow, size: 32), onPressed: () { setState(() { _controller.value.isPlaying ? _controller.pause() : _controller.play(); }); }),
          ]),
        ],
      ),
    );
  }
}
`;
}

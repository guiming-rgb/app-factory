import "package:flame/game.dart";
import "package:flame/components.dart";
import "package:flame/input.dart";
import "package:flutter/material.dart";

/// 简单 2D 游戏引擎模板 — 基于 Flame
/// 对标：Flappy Bird / 跳一跳 级别的轻量休闲游戏
/// 不是「list 页冒充游戏」— 是真的游戏循环 + 碰撞检测 + 分数系统

class SimpleGame extends FlameGame with TapDetector {
  late Player _player;
  late TextComponent _scoreText;
  int _score = 0;
  double _speed = 200;
  final List<Obstacle> _obstacles = [];
  double _spawnTimer = 0;

  @override
  Future<void> onLoad() async {
    _player = Player()..position = Vector2(size.x / 2, size.y / 2);
    add(_player);

    _scoreText = TextComponent(text: "0", position: Vector2(20, 20),
      textRenderer: TextPaint(style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)));
    add(_scoreText);
  }

  @override
  void update(double dt) {
    super.update(dt);
    _spawnTimer += dt;
    if (_spawnTimer > 1.5) { _spawnTimer = 0; _spawnObstacle(); }

    for (final o in List.from(_obstacles)) {
      if (o.position.x < -50) { _obstacles.remove(o); remove(o); }
      if (_player.toRect().overlaps(o.toRect())) { _gameOver(); }
    }
    _score++; _scoreText.text = (_score ~/ 10).toString();
  }

  void _spawnObstacle() {
    final o = Obstacle()..position = Vector2(size.x + 20, size.y - 60);
    _obstacles.add(o); add(o);
  }

  void _gameOver() {
    overlays.add("GameOver");
    pauseEngine();
  }

  @override
  void onTap() {
    _player.jump();
  }
}

class Player extends PositionComponent with HasGameRef<SimpleGame> {
  double _velocity = 0;
  static const gravity = 600;
  static const jumpForce = -250;

  Player() : super(size: Vector2(40, 40));

  @override
  Future<void> onLoad() async {
    anchor = Anchor.center;
  }

  void jump() {
    if (position.y > 50) _velocity = jumpForce;
  }

  @override
  void update(double dt) {
    super.update(dt);
    _velocity += gravity * dt;
    position.y += _velocity * dt;
    position.y = position.y.clamp(20, gameRef.size.y - 20);
  }

  @override
  void render(Canvas canvas) {
    canvas.drawCircle(Offset.zero, 20, Paint()..color = Colors.blue);
  }
}

class Obstacle extends PositionComponent with HasGameRef<SimpleGame> {
  Obstacle() : super(size: Vector2(30, 80 + (DateTime.now().millisecond % 100)));

  @override
  Future<void> onLoad() async {
    anchor = Anchor.center;
  }

  @override
  void update(double dt) {
    position.x -= 200 * dt;
  }

  @override
  void render(Canvas canvas) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(size.toRect(), const Radius.circular(6)),
      Paint()..color = Colors.red,
    );
  }
}

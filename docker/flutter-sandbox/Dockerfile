# v2.1：Flutter 沙箱（与 templates/flutter-minimal SDK ^3.7 对齐）
FROM ghcr.io/cirruslabs/flutter:stable

WORKDIR /workspace

# 预拉常用依赖缓存层（实际工程在运行时挂载到 /workspace）
RUN flutter --version && dart --version

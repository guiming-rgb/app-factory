/** 小程序首页：本地待办 MVP */
export function emitTodoIndexWxml(displayTitle: string): string {
  const title = displayTitle.replace(/</g, "");
  return `<view class="page">
  <privacy-popup show="{{showPrivacy}}" bind:accept="onPrivacyAccept" />

  <view class="card">
    <view class="todo-title">${title}</view>
    <view class="muted">本地待办 · 添加 / 完成 / 删除</view>
  </view>

  <view class="card todo-input-row">
    <input class="todo-input" placeholder="输入新任务…" value="{{inputText}}" bindinput="onInput" confirm-type="done" bindconfirm="onAdd" />
    <button class="todo-add-btn" type="primary" size="mini" bindtap="onAdd">添加</button>
  </view>

  <view class="card" wx:if="{{todos.length === 0}}">
    <view class="empty">暂无任务，请在上方添加</view>
  </view>

  <block wx:for="{{todos}}" wx:key="id">
    <view class="card todo-item">
      <checkbox checked="{{item.done}}" data-id="{{item.id}}" bindchange="onToggleChange" />
      <text class="todo-text {{item.done ? 'done' : ''}}" data-id="{{item.id}}" bindtap="onToggle">{{item.title}}</text>
      <button class="todo-del-btn" size="mini" data-id="{{item.id}}" bindtap="onDelete">删除</button>
    </view>
  </block>
</view>
`;
}

export function emitTodoIndexJs(): string {
  return `const { isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: {
    showPrivacy: false,
    supabaseReady: false,
    inputText: "",
    todos: [{ id: "1", title: "示例：买牛奶", done: false }]
  },

  onShow() {
    const app = getApp();
    const accepted = app.globalData.privacyAccepted;
    this.setData({
      showPrivacy: !accepted,
      supabaseReady: isSupabaseConfigured()
    });
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onAdd() {
    const text = (this.data.inputText || "").trim();
    if (!text) return;
    const todos = this.data.todos.concat([
      { id: String(Date.now()), title: text, done: false }
    ]);
    this.setData({ todos, inputText: "" });
  },

  todoIdFromEvent(e) {
    return String(e.currentTarget.dataset.id ?? "");
  },

  onToggle(e) {
    const id = this.todoIdFromEvent(e);
    const todos = this.data.todos.map((t) =>
      String(t.id) === id ? { ...t, done: !t.done } : t
    );
    this.setData({ todos });
  },

  onToggleChange(e) {
    const id = this.todoIdFromEvent(e);
    const checked = !!e.detail.value;
    const todos = this.data.todos.map((t) =>
      String(t.id) === id ? { ...t, done: checked } : t
    );
    this.setData({ todos });
  },

  onDelete(e) {
    const id = this.todoIdFromEvent(e);
    this.setData({
      todos: this.data.todos.filter((t) => String(t.id) !== id)
    });
  }
});
`;
}

export function emitTodoIndexWxss(): string {
  return `.todo-title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.todo-input-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}
.todo-input {
  flex: 1;
  border: 1rpx solid #e5e7eb;
  border-radius: 8rpx;
  padding: 16rpx;
  background: #fff;
}
.todo-add-btn {
  flex-shrink: 0;
}
.todo-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}
.todo-text {
  flex: 1;
  font-size: 28rpx;
}
.todo-text.done {
  text-decoration: line-through;
  color: #9ca3af;
}
.todo-del-btn {
  flex-shrink: 0;
}
`;
}

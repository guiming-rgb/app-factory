/** 鸿蒙 Index 页：本地待办 MVP + Preferences 持久化 */
export function emitHarmonyTodoIndexEts(displayTitle: string): string {
  const title = displayTitle.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `import preferences from '@ohos.data.preferences';

@Entry
@Component
struct Index {
  @State todos: Array<TodoItem> = [
    { id: 1, title: '示例：买牛奶', done: false }
  ]
  @State inputText: string = ''
  private nextId: number = 2
  private readonly storeName: string = 'app_factory_todo_v1'
  private readonly storeKey: string = 'list'

  async aboutToAppear() {
    await this.loadTodos()
  }

  async loadTodos() {
    try {
      const ctx = getContext(this)
      const pref = await preferences.getPreferences(ctx, this.storeName)
      const raw = (await pref.get(this.storeKey, '')) as string
      if (raw && raw.length > 2) {
        const parsed = JSON.parse(raw) as Array<TodoItem>
        if (parsed.length > 0) {
          this.todos = parsed
          let maxId = 1
          for (let i = 0; i < parsed.length; i++) {
            if (parsed[i].id >= maxId) {
              maxId = parsed[i].id + 1
            }
          }
          this.nextId = maxId
        }
      }
    } catch (_) {
      /* 使用默认示例 */
    }
  }

  async persistTodos() {
    try {
      const ctx = getContext(this)
      const pref = await preferences.getPreferences(ctx, this.storeName)
      await pref.put(this.storeKey, JSON.stringify(this.todos))
      await pref.flush()
    } catch (_) {
      /* 忽略 */
    }
  }

  addTodo() {
    const text = this.inputText.trim()
    if (text.length === 0) {
      return
    }
    const item: TodoItem = { id: this.nextId, title: text, done: false }
    this.nextId = this.nextId + 1
    this.todos = this.todos.concat([item])
    this.inputText = ''
    this.persistTodos()
  }

  toggleTodo(id: number) {
    const next: Array<TodoItem> = []
    for (let i = 0; i < this.todos.length; i++) {
      const cur = this.todos[i]
      if (cur.id === id) {
        next.push({ id: cur.id, title: cur.title, done: !cur.done })
      } else {
        next.push(cur)
      }
    }
    this.todos = next
    this.persistTodos()
  }

  deleteTodo(id: number) {
    this.todos = this.todos.filter((item: TodoItem) => item.id !== id)
    this.persistTodos()
  }

  build() {
    Column() {
      Text('${title}')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 16, bottom: 8 })
      Text('本地待办 · 添加 / 完成 / 删除 · 已持久化')
        .fontSize(13)
        .opacity(0.65)
        .margin({ bottom: 12 })

      Row() {
        TextInput({ placeholder: '输入新任务…', text: this.inputText })
          .layoutWeight(1)
          .onChange((value: string) => {
            this.inputText = value
          })
        Button('添加')
          .margin({ left: 8 })
          .onClick(() => this.addTodo())
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 8 })

      if (this.todos.length === 0) {
        Text('暂无任务，请在上方添加')
          .fontSize(14)
          .opacity(0.5)
          .margin({ top: 24 })
      } else {
        List() {
          ForEach(this.todos, (item: TodoItem) => {
            ListItem() {
              Row() {
                Checkbox({ name: 'todo', group: 'todos' })
                  .select(item.done)
                  .onChange((checked: boolean) => {
                    if (checked !== item.done) {
                      this.toggleTodo(item.id)
                    }
                  })
                Text(item.title)
                  .layoutWeight(1)
                  .margin({ left: 8, right: 8 })
                  .decoration({
                    type: item.done ? TextDecorationType.LineThrough : TextDecorationType.None
                  })
                  .opacity(item.done ? 0.55 : 1)
                  .onClick(() => this.toggleTodo(item.id))
                Button('删除')
                  .fontSize(12)
                  .height(28)
                  .onClick(() => this.deleteTodo(item.id))
              }
              .width('100%')
              .padding(12)
            }
          }, (item: TodoItem) => \`\${item.id}\`)
        }
        .layoutWeight(1)
        .width('100%')
      }
    }
    .width('100%')
    .height('100%')
  }
}

interface TodoItem {
  id: number
  title: string
  done: boolean
}
`;
}

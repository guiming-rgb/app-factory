/**
 * Supabase 配置（鸿蒙端）
 * 生产工厂注入 URL / anon key
 */
export class SupabaseConfig {
  static readonly URL: string = '__SUPABASE_URL__'
  static readonly ANON_KEY: string = '__SUPABASE_ANON_KEY__'

  static isConfigured(): boolean {
    return this.URL.length > 0 && !this.URL.startsWith('__')
  }

  static async request(path: string, options?: {
    method?: string
    body?: Record<string, Object>
    headers?: Record<string, string>
  }): Promise<Object | null> {
    if (!this.isConfigured()) return null
    try {
      const resp = await fetch(`${this.URL}/rest/v1/${path}`, {
        method: options?.method ?? 'GET',
        headers: {
          'apikey': this.ANON_KEY,
          'Authorization': `Bearer ${this.ANON_KEY}`,
          'Content-Type': 'application/json',
          ...(options?.headers ?? {})
        },
        body: options?.body ? JSON.stringify(options.body) : undefined
      })
      return await resp.json()
    } catch (e) {
      console.error('[Supabase]', JSON.stringify(e))
      return null
    }
  }
}

const { request, isSupabaseConfigured } = require("../../utils/supabase");

Page({
  data: {
    entityName: "transactions",
    table: "transactions",
    pk: "id",
    titleField: "title",
    recordId: "",
    displayTitle: "",
    loading: false,
    error: "",
    record: null,
    fieldDefs: [
      { key: "id", prop: "id" },
      { key: "title", prop: "title" },
      { key: "amount", prop: "amount" },
      { key: "created_at", prop: "created_at" }
    ],
    fieldRows: []
  },

  onLoad(query) {
    const recordId = query.id ? String(query.id) : "";
    const entity = query.entity ? String(query.entity) : "transactions";
    this.setData({ recordId, entityName: entity });
    if (recordId) this.loadRecord(recordId);
  },

  loadRecord(recordId) {
    if (!isSupabaseConfigured()) {
      this.setData({
        error: "Supabase 未配置：请在 app.js globalData 填入 URL 与 anon key",
        loading: false
      });
      return;
    }
    this.setData({ loading: true, error: "" });
    const filter = encodeURIComponent(this.data.pk + "=eq." + recordId);
    request(
      this.data.table + "?select=id,title,amount,created_at&" + filter,
      { method: "GET" }
    )
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const record = list[0] || null;
        const titleField = this.data.titleField;
        const displayTitle =
          record && record[titleField] != null
            ? String(record[titleField])
            : record && record.title != null
              ? String(record.title)
              : "—";
        const fieldRows = record
          ? this.data.fieldDefs.map((f) => ({
              key: f.key,
              value: record[f.prop] != null ? String(record[f.prop]) : "—"
            }))
          : [];
        this.setData({ record, displayTitle, fieldRows, loading: false });
      })
      .catch((err) => {
        this.setData({
          error: err && err.message ? err.message : "加载失败",
          loading: false
        });
      });
  }
});

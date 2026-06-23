const { request, isSupabaseConfigured } = require("../../utils/supabase");
const { financeService } = require("../../services/industry");

const FALLBACK_ITEMS = [
      { id: "1", title: "账单一", subtitle: "transactions.title — 离线示例（拉取失败时显示）" },
      { id: "2", title: "账单二", subtitle: "transactions.title — 由 App Spec 生成" },
      { id: "3", title: "账单三", subtitle: "transactions.title — 记账本·真机样本" }
];

const PAGE_SIZE = 15;

Page({
  data: {
    showPrivacy: false,
    supabaseReady: false,
    loading: false,
    loadError: "",
    entityName: "transactions",
    table: "transactions",
    pk: "id",
    titleField: "title",
    searchText: "",
    items: FALLBACK_ITEMS,
    page: 0,
    hasMore: true
  },

  onShow() {
    const app = getApp();
    const accepted = !!app.globalData.privacyAccepted;
    const supabaseReady = isSupabaseConfigured();
    this.setData({ showPrivacy: !accepted, supabaseReady, page: 0, hasMore: true });
    if (accepted) this.loadItems(true);
  },

  onPrivacyAccept() {
    const app = getApp();
    app.globalData.privacyAccepted = true;
    wx.setStorageSync("privacy_accepted", true);
    this.setData({ showPrivacy: false });
    this.loadItems(true);
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadItems(true), 300);
  },

  onPullDownRefresh() { this.loadItems(true).then(() => wx.stopPullDownRefresh()); },
  onReachBottom() { if (this.data.hasMore) this.loadItems(false); },

  loadItems(reset) {
    if (!isSupabaseConfigured()) {
      this.setData({ items: FALLBACK_ITEMS, loadError: "", loading: false });
      return;
    }
    const page = reset ? 0 : this.data.page + 1;
    const from = page * PAGE_SIZE;
    this.setData({ loading: true, loadError: "" });
    return financeService.list()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const tf = this.data.titleField;
        const pk = this.data.pk;
        const newItems = list.map((row, i) => {
          const id = row[pk] != null ? String(row[pk]) : String(i + 1);
          const title = row[tf] != null ? String(row[tf]) : (row.title != null ? String(row.title) : "—");
          return { id, title, subtitle: this.data.entityName + " · " + id };
        });
        this.setData({ items: newItems, loading: false, page: 0, hasMore: false });
      })
      .catch((err) => {
        if (reset) this.setData({ items: FALLBACK_ITEMS });
        this.setData({
          loadError: err && err.message ? err.message : "拉取失败",
          loading: false
        });
      });
  },

  loadMore() { this.loadItems(false); },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: "/pages/entity-detail/entity-detail?id=" + encodeURIComponent(String(id)) + "&entity=" + encodeURIComponent(this.data.entityName)
    });
  },

  onTapAdd() {
    wx.navigateTo({ url: "/pages/form/form?id=form" });
  }
});

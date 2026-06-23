Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onAccept() {
      this.triggerEvent("accept");
    }
  }
});

export default function FormData() {
  return {
    appends: [],
    append: function append(key, val) {
      this.appends.push({ key, val });
    },
  };
}

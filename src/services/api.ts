export const apiService = {
  async getChats() {
    const res = await fetch("/api/chats");
    return res.json();
  },
  async saveChat(chat: { id: string; title: string; messages: any[] }) {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chat)
    });
    return res.json();
  },
  async deleteChat(id: string) {
    const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
    return res.json();
  },
  async getFiles() {
    const res = await fetch("/api/files");
    return res.json();
  },
  async writeFile(name: string, content: string) {
    const res = await fetch("/api/files/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content })
    });
    return res.json();
  },
  async deleteFile(name: string) {
    const res = await fetch(`/api/files/${name}`, { method: "DELETE" });
    return res.json();
  }
};

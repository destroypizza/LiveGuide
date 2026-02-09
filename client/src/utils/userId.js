const STORAGE_KEY = "live-control-user-id";

export const getOrCreateUserId = () => {
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `user_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};

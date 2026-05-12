export const saveAuth = (data) => {
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("user_id", data.user_id);
  localStorage.setItem("name", data.full_name);
};

export const logout = () => {
  localStorage.clear();
};

export const getToken = () => localStorage.getItem("token");
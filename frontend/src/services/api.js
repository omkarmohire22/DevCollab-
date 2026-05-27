import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function withToken(token) {
  return axios.create({
    baseURL: API_BASE,
    headers: getHeaders(token),
  });
}

export async function request(method, path, body = null, token = null, options = {}) {
  const client = withToken(token);
  const response = await client.request({ method, url: path, data: body, ...options });
  return response.data;
}

export const authApi = {
  validate: (token) => request("post", "/auth/validate", null, token),
  passwordReset: (email) => request("post", "/auth/password-reset", { email }),
};

export const userApi = {
  current: (token) => request("get", "/users/me", null, token),
  update: (body, token) => request("put", "/users/me", body, token),
};

export const workspaceApi = {
  list: (token) => request("get", "/workspaces", null, token),
  create: (body, token) => request("post", "/workspaces", body, token),
  details: (id, token) => request("get", `/workspaces/${id}`, null, token),
  update: (id, body, token) => request("put", `/workspaces/${id}`, body, token),
  delete: (id, token) => request("delete", `/workspaces/${id}`, null, token),
  members: (id, token) => request("get", `/workspaces/${id}/members`, null, token),
  updateMember: (id, profileId, body, token) => request("put", `/workspaces/${id}/members/${profileId}`, body, token),
  removeMember: (id, profileId, token) => request("delete", `/workspaces/${id}/members/${profileId}`, null, token),
  invites: (id, token) => request("get", `/workspaces/${id}/invites`, null, token),
};

export const projectApi = {
  list: (token) => request("get", "/projects", null, token),
  create: (body, token) => request("post", "/projects", body, token),
  details: (id, token) => request("get", `/projects/${id}`, null, token),
};

export const taskApi = {
  list: (params, token) => request("get", "/tasks", null, token, { params }),
  create: (body, token) => request("post", "/tasks", body, token),
  update: (id, body, token) => request("put", `/tasks/${id}`, body, token),
  delete: (id, token) => request("delete", `/tasks/${id}`, null, token),
  comment: (id, body, token) => request("post", `/tasks/${id}/comments`, body, token),
};

export const snippetApi = {
  list: (token) => request("get", "/snippets", null, token),
  create: (body, token) => request("post", "/snippets", body, token),
  update: (id, body, token) => request("put", `/snippets/${id}`, body, token),
  delete: (id, token) => request("delete", `/snippets/${id}`, null, token),
};

export const wikiApi = {
  list: (token) => request("get", "/wiki", null, token),
  create: (body, token) => request("post", "/wiki", body, token),
  update: (id, body, token) => request("put", `/wiki/${id}`, body, token),
};

export const notificationApi = {
  list: (token) => request("get", "/notifications", null, token),
  markRead: (ids, token) => request("post", "/notifications/mark-read", { ids }, token),
};

export const invitationApi = {
  create: (body, token) => request("post", "/invitations", body, token),
  get: (tokenId) => request("get", `/invitations/${tokenId}`),
  accept: (tokenId, token) => request("post", `/invitations/${tokenId}/accept`, null, token),
  resend: (id, token) => request("post", `/invitations/${id}/resend`, null, token),
  delete: (id, token) => request("delete", `/invitations/${id}`, null, token),
};

export const paymentApi = {
  checkout: (body, token) => request("post", "/payments/checkout", body, token),
  transactions: (workspaceId, token) => request("get", `/payments/transactions?workspace_id=${workspaceId}`, null, token),
};

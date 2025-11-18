import { api } from "../api/client";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  window.location.href = "/";
}

export async function login(email: string, password: string) {
  try {
    const data = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Save token if provided, otherwise use a default token
    if (data.token) {
      localStorage.setItem("accessToken", data.token);
    } else if (data.id) {
      // If no token provided, create a simple identifier
      localStorage.setItem("accessToken", `token_${data.id}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function register(email: string, password: string) {
  try {
    const data = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Save token if provided, otherwise use a default token
    if (data.token) {
      localStorage.setItem("accessToken", data.token);
    } else if (data.id) {
      // If no token provided, create a simple identifier
      localStorage.setItem("accessToken", `token_${data.id}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}


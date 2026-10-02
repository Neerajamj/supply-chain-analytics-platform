
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function login(email: string, password: string) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Invalid email or password"
        : `Login failed: ${response.status}`
    );
  }

  const data = await response.json();
  localStorage.setItem("flowops_token", data.access_token);

  return data;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("flowops_token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function logout() {
  localStorage.removeItem("flowops_token");
}

import axios from "axios";

// Read API URL from environment variables, fallback to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const parseErrorDetail = (err) => {
  const detail = err.response?.data?.detail;
  if (!detail) {
    return err.message || "An unexpected connection error occurred.";
  }
  if (Array.isArray(detail)) {
    return detail.map((d) => {
      const field = d.loc && d.loc.length > 1 ? `${d.loc[d.loc.length - 1]}: ` : "";
      return `${field}${d.msg}`;
    }).join("; ");
  }
  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return detail;
};

export default api;
export { API_BASE_URL };

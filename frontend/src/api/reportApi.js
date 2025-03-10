import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getReports = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/reports`);
    return response.data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

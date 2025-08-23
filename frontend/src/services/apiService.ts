import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Backend'in çalıştığı URL

export const getGroups = async () => {
  const response = await axios.get(`${API_BASE_URL}/groups`);
  return response.data;
};

export const getCampaigns = async () => {
  const response = await axios.get(`${API_BASE_URL}/campaigns`);
  return response.data;
};

export const getTimeline = async (params: Record<string, string | number | undefined>) => {
  const response = await axios.get(`${API_BASE_URL}/timeline`, { params });
  return response.data;
};

export const refreshCache = async () => {
  const response = await axios.post(`${API_BASE_URL}/refresh`);
  return response.data;
};
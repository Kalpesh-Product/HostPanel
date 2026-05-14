import axios from "axios";

const rawBaseURL = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_LINK
  : import.meta.env.VITE_PROD_LINK;
const baseURL = String(rawBaseURL || "").replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
});

export const axiosPrivate = axios.create({
  baseURL,
  withCredentials: true,
});

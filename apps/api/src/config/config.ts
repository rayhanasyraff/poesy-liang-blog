export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  fallbackPorts: [3001, 3011, 3021, 3031], // Fallback ports if primary port is in use
  poesyliangNet: {
    apiBaseUrl: process.env.POESYLIANG_NET_API_BASE_URL || "http://poesyliang.net/api.php",
    bearerToken: process.env.POESYLIANG_NET_BEARER_TOKEN || "g6N3wnb#DWm",
  },
  poesyliangCom: {
    apiBaseUrl: process.env.POESYLIANG_COM_API_BASE_URL || "http://archive.poesyliang.com/api.php",
    bearerToken: process.env.POESYLIANG_COM_BEARER_TOKEN || "lx89nTpfm#",
  },
  cache: {
    duration: 5 * 60 * 1000, // 5 minutes
  },
  pagination: {
    defaultLimit: 5000 as number,
    fetchLimit: 5000 as number,
  },
};

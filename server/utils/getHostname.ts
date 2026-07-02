interface HostnameParams {
  useSsl?: boolean;
  ip?: string;
  port?: number;
  urlBase?: string;
}

export const getHostname = (params?: HostnameParams): string => {
  const { useSsl, ip, port, urlBase } = params ?? {
    useSsl: false,
    ip: '',
    port: 0,
    urlBase: '',
  };

  const hostname = `${useSsl ? 'https' : 'http'}://${ip}:${port}${urlBase}`;

  return hostname;
};

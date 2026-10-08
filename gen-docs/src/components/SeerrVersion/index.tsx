import { useEffect, useState } from 'react';

export const SeerrVersion = () => {
  const [version, setVersion] = useState<string | null>('0.0.0');

  useEffect(() => {
    async function fetchVersion() {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/Project516/seearr/master/package.json'
        );

        const data = await response.json();

        setVersion(data.version);
        console.log(data.version);
      } catch (error) {
        console.error('Failed to fetch version', error);
        setVersion('Error fetching version');
      }
    }
    fetchVersion();
  }, []);

  return version;
};

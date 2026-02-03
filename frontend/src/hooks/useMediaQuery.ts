import { useEffect, useState } from 'react';

const getInitialMatch = (query: string) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(query).matches;
};

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => getInitialMatch(query));

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      mediaQueryList.addListener(handleChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;

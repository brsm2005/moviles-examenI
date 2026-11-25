import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mounted) return;
      const disconnected =
        state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(disconnected);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { isOffline };
}

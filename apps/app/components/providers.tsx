"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfigProvider, MotionProvider } from '@lobehub/ui';
import { motion } from 'framer-motion';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <ConfigProvider motion={motion}>
      <MotionProvider motion={motion}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MotionProvider>
    </ConfigProvider>
  );
}

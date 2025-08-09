// frontend/src/components/docker/pages/DockerOverviewPage.tsx
// MIGRATED - Docker overview page using navigation context

import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  GridItem,
  Text,
  HStack,
  Stack,
  Card,
  Stat,
} from "@chakra-ui/react";
import {
  PiShippingContainerFill,
  PiFloppyDiskFill,
  PiNetworkFill,
  PiStackFill,
  PiHardDrivesFill,
} from "react-icons/pi";

// CHANGED - Using new API hooks and navigation context
import { useDockerStats, useStacks } from "@/hooks/useNewApi";
import { useNavigation } from "@/contexts/NavigationContext";
import { RealtimeStacksTest } from "@/components/debug/RealTimeStackTest";
import { useLiveSystemStats } from "@/hooks/useSystemStats";

export const DashboardMainPage: React.FC = () => {
  // NEW - Using navigation context instead of props
  const { onNavigate } = useNavigation();

  return <Box w="100%" p="4"></Box>;
};

export default DashboardMainPage;

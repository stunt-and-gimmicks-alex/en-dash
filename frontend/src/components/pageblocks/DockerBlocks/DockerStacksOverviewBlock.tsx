import {
  Badge,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Stack,
  Status,
  Link,
} from "@chakra-ui/react";
import {
  LuGitBranch,
  LuGithub,
  LuGlobe,
  LuRocket,
  LuRotateCcw,
  LuLayers,
  LuSquare,
  LuSettings,
} from "react-icons/lu";

export const StackBlocks = () => {
  return (
    <Container maxW="6xl" p="8" bg="brand.surfaceContainerHighest">
      <Flex
        justify="space-between"
        align="flex-start"
        gap="8"
        direction={{ base: "column", md: "row" }}
      >
        <Stack gap="3">
          <HStack fontWeight="medium" color="fg.muted">
            <LuLayers /> Stack
          </HStack>

          <HStack>
            <Heading size="2xl" mr="4">
              chakra-v3-docs
            </Heading>
            <Badge size="md" colorPalette="gray" fontWeight="medium">
              Public
            </Badge>
            <Badge size="md" fontWeight="medium">
              Template
            </Badge>
          </HStack>

          <HStack
            fontFamily="mono"
            color="fg.muted"
            textStyle="sm"
            gap="5"
            mb="2"
          >
            <HStack>
              <LuSettings /> chakra-ui/chakra-v3-docs
            </HStack>
            <HStack>
              <LuSettings /> main
            </HStack>
            <Status.Root colorPalette="green">
              <Status.Indicator />
              Ready
            </Status.Root>
          </HStack>

          <Link color="colorPalette.fg" href="#">
            https://chakra-v3-docs.vercel.app
          </Link>
        </Stack>

        <HStack gap="4">
          <Button variant="outline" colorPalette="gray" size="lg">
            <LuRotateCcw /> Rollback
          </Button>
          <Button size="lg">
            <LuSettings />
            Deploy
          </Button>
        </HStack>
      </Flex>
    </Container>
  );
};

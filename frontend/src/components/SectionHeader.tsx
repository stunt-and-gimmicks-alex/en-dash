import type React from "react";
import {
  Badge,
  Heading,
  HStack,
  Stack,
  type StackProps,
  Text,
} from "@chakra-ui/react";
import {
  LuCircleDashed,
  LuCircleDot,
  LuCircleDotDashed,
  LuCircleSlash,
} from "react-icons/lu";

/**
 * Props for the SectionHeader component.
 * @extends StackProps from Chakra UI
 */
export interface SectionHeaderProps extends StackProps {
  /** The text to display above the main heading */
  tagline?: React.ReactNode;
  /** The main heading text */
  headline: React.ReactNode;
  /** The descriptive text that appears below the heading */
  description?: React.ReactNode;
  /** Optional content for rendering badges and statuses */
  optGreen?: React.ReactNode;
  optYellow?: React.ReactNode;
  optRed?: React.ReactNode;
  optGray?: React.ReactNode;
  /** Optional content to render below the header section */
  children?: React.ReactNode;
}

export const SectionHeader = (props: SectionHeaderProps) => {
  const {
    tagline,
    headline,
    description,
    optGreen,
    optYellow,
    optRed,
    optGray,
    ...rootProps
  } = props;
  return (
    <Stack gap={{ base: "4", md: "6" }} {...rootProps}>
      <Stack gap={{ base: "3", md: "4" }}>
        <Stack gap={{ base: "1", md: "3" }}>
          {tagline && (
            <Text
              textStyle={{ base: "xs", md: "sm" }}
              fontWeight="medium"
              color="brand.onPrimaryContainer"
            >
              {tagline}
            </Text>
          )}
          <HStack gap="8">
            <Heading
              as="h2"
              textStyle={{ base: "xl", md: "2xl" }}
              color="brand.onSurface"
            >
              {headline}
            </Heading>
            {optGreen && (
              <Badge variant="solid" colorPalette="green">
                <LuCircleDot />
                {optGreen}
              </Badge>
            )}
            {optYellow && (
              <Badge variant="solid" colorPalette="yellow">
                <LuCircleDotDashed />
                {optYellow}
              </Badge>
            )}
            {optRed && (
              <Badge variant="solid" colorPalette="red">
                <LuCircleSlash />
                {optRed}
              </Badge>
            )}
            {optGray && (
              <Badge variant="solid" colorPalette="grey">
                <LuCircleDashed />
                {optGray}
              </Badge>
            )}
          </HStack>
        </Stack>
        {description && (
          <Text
            color="brand.onSurfaceVariant"
            textStyle={{ base: "md", md: "lg" }}
            maxW="3xl"
          >
            {description}
          </Text>
        )}
      </Stack>
      {props.children}
    </Stack>
  );
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { forwardRef } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  Button,
  type ButtonProps,
  CloseButton,
  Drawer,
  IconButton,
  Stack,
} from "@chakra-ui/react";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      Icon Imports     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  LuAlignCenter,
  LuAlignJustify,
  LuAlignLeft,
  LuAlignRight,
  LuAlignVerticalDistributeCenter,
  LuAlignVerticalDistributeEnd,
  LuAlignVerticalDistributeStart,
  LuArrowLeftRight,
  LuArrowUpDown,
  LuPlus,
} from "react-icons/lu";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      App Imports      ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  ColorField,
  NumberField,
  NumberFieldWithUnit,
  SegmentField,
  SelectField,
  TextField,
  TextAreaField,
} from "./NewDockerApplicationDrawerFields";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";

export const NewDockDrawerServices = () => {
  const { newStack, setNewStack, resetStack } = useNewStackStore();

  const setStackName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewStack((stack) => {
      stack.name = e.target.value;
    });
  };

  const setStackDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewStack((stack) => {
      stack.description = e.target.value;
    });
  };

  const setStackConfig = (configs: Record<string, any>) => {
    setNewStack((stack) => {
      stack.configs = configs;
    });
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>New Docker Application: Basic Config</Drawer.Title>
      </Drawer.Header>
      <Drawer.Body colorPalette="secondaryBrand">
        <Stack px="4" pt="4" pb="6">
          <PropertySection title="Describing The App">
            <TextField
              label="App Name"
              defaultValue={newStack.name}
              placeholder="Enter a memorable name... like Horatio"
              onChange={setStackName}
            />
            <TextAreaField
              label="App Name"
              defaultValue={newStack.name}
              placeholder="And a description thats descriptive!"
              onChange={setStackDescription}
            />
          </PropertySection>
          <PropertySection title="Use a Pre-Configured Application">
            <SelectField
              label="Template"
              defaultValue="none"
              disabled
              options={[
                { label: "None", value: "none" },
                { label: "React + NGINX App", value: "react_nginx" },
                { label: "Plex + Arrs", value: "plex_arrs" },
              ]}
            />
            <Button disabled variant="outline" w="full" h="1">
              Load Config
            </Button>
          </PropertySection>
          <PropertySection title="Text" action={<AddButton />}>
            <TextField label="Content" defaultValue="Chakra UI" />
            <NumberField label="Spacing" defaultValue="10" />
            <ColorField label="Color" defaultValue="#eb5e41" />
            <NumberFieldWithUnit
              label="Size"
              defaultValue="16"
              units={[
                { label: "Pixels", value: "px" },
                { label: "Rem", value: "rem" },
                { label: "Em", value: "em" },
              ]}
            />
            <NumberFieldWithUnit
              label="Letter"
              defaultValue="1"
              units={[
                { label: "Pixels", value: "px" },
                { label: "Rem", value: "rem" },
                { label: "Em", value: "em" },
              ]}
            />
            <SegmentField
              label="Align"
              options={[
                { label: <LuAlignCenter />, value: "center" },
                { label: <LuAlignLeft />, value: "start" },
                { label: <LuAlignRight />, value: "end" },
                { label: <LuAlignJustify />, value: "justify" },
              ]}
            />
          </PropertySection>
        </Stack>
      </Drawer.Body>
      <Drawer.Footer>
        <Button>Save</Button>
      </Drawer.Footer>
      <Drawer.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Drawer.CloseTrigger>
    </>
  );
};

const AddButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return (
    <IconButton
      variant="ghost"
      size="xs"
      ref={ref}
      colorPalette="gray"
      {...props}
    >
      <LuPlus />
    </IconButton>
  );
});

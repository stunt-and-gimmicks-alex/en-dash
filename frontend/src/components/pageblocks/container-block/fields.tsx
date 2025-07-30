"use client";

import {
  Badge,
  Box,
  ColorPicker,
  Field,
  GridItem,
  HStack,
  Input,
  InputGroup,
  NativeSelect,
  NumberInput,
  parseColor,
  SegmentGroup,
  Text,
  Textarea,
} from "@chakra-ui/react";

interface BaseFieldProps {
  label: string;
  cols?: number;
  name?: string;
  invalid?: boolean;
  disabled?: boolean;
}
interface LabelFieldProps extends BaseFieldProps {
  badgeText?: string;
  badgeColor: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function LabelField(props: LabelFieldProps) {
  const {
    name,
    badgeColor,
    badgeText,
    invalid,
    cols,
    disabled,
    defaultValue,
    onChange,
    value,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Text textStyle="sm" fontWeight="medium" color="fg.muted">
        {value}
        <Badge colorPalette={badgeColor}>{badgeText}</Badge>
      </Text>
    </GridItem>
  );
}

interface TextFieldProps extends BaseFieldProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function TextField(props: TextFieldProps) {
  const {
    name,
    label,
    invalid,
    cols,
    disabled,
    defaultValue,
    onChange,
    value,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation="vertical"
        invalid={invalid}
        disabled={false}
        colorPalette="brand"
      >
        <Field.Label>
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        </Field.Label>
        <Input
          name={name}
          size="sm"
          w="full"
          flex="1"
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(e.currentTarget.value)}
          value={value}
          borderColor="brand.outlineVariant"
          variant="flushed"
          color="teal.solid"
        />
      </Field.Root>
    </GridItem>
  );
}

interface TextAreaProps extends BaseFieldProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  size?: "sm" | "md" | "lg" | "xl" | "xs" | undefined;
  onChange?: (value: string) => void;
}

export function TextArea(props: TextAreaProps) {
  const {
    name,
    label,
    cols,
    size,
    invalid,
    disabled,
    defaultValue,
    onChange,
    value,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation="vertical"
        invalid={invalid}
        disabled={false}
        width="full"
      >
        <Field.Label>
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        </Field.Label>
        <Textarea
          name={name}
          size="sm"
          maxW="full"
          flex="1"
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(e.currentTarget.value)}
          value={value}
          autoresize
          maxH="3lh"
          resize="none"
          borderColor="brand.outlineVariant"
          variant="flushed"
          color="teal.solid"
        />
      </Field.Root>
    </GridItem>
  );
}

type Options = Array<{ label: React.ReactNode; value: string }>;

interface SelectFieldProps extends BaseFieldProps {
  orientation?: "horizontal" | "vertical";
  options: Options;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  helperText?: string;
}

export function SelectField(props: SelectFieldProps) {
  const {
    name,
    label,
    cols,
    invalid,
    disabled,
    defaultValue,
    onChange,
    value,
    options,
    orientation = "horizontal",
    helperText,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation={orientation}
        invalid={invalid}
        disabled={disabled}
      >
        <Field.Label>{label}</Field.Label>
        <NativeSelect.Root
          size="sm"
          maxW={orientation === "horizontal" ? "1/2" : "auto"}
          flex="1"
          borderColor="brand.outlineVariant"
        >
          <NativeSelect.Field
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={(e) => onChange?.(e.currentTarget.value)}
            color="teal.solid"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
      </Field.Root>
    </GridItem>
  );
}

interface SegmentFieldProps extends BaseFieldProps {
  options: Options;
  value?: string;
  defaultValue?: string;
  onChange?: (event: string) => void;
}

export function SegmentField(props: SegmentFieldProps) {
  const {
    name,
    label,
    invalid,
    cols,
    disabled,
    options,
    defaultValue,
    onChange,
    value,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation="horizontal"
        invalid={invalid}
        disabled={disabled}
      >
        <Field.Label>
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        </Field.Label>
        <SegmentGroup.Root
          name={name}
          defaultValue={defaultValue}
          value={value}
          size="sm"
          flex="1"
          maxW="1/2"
          onValueChange={(e) => onChange?.(e.value as string)}
          borderColor="brand.outlineVariant"
          color="teal.solid"
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items
            items={options}
            flex="1"
            justifyContent="center"
            px="2"
          />
        </SegmentGroup.Root>
      </Field.Root>
    </GridItem>
  );
}

interface NumberFieldProps extends BaseFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField(props: NumberFieldProps) {
  const {
    name,
    label,
    invalid,
    cols,
    disabled,
    defaultValue,
    value,
    onChange,
    min,
    max,
    step,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation="horizontal"
        invalid={invalid}
        disabled={disabled}
      >
        <Field.Label>
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        </Field.Label>
        <NumberInput.Root
          name={name}
          flex="1"
          maxW="1/2"
          size="sm"
          onValueChange={(e) => onChange?.(e.value)}
          value={value}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          borderColor="brand.outlineVariant"
          color="teal.solid"
        >
          <NumberInput.Control />
          <NumberInput.Input />
        </NumberInput.Root>
      </Field.Root>
    </GridItem>
  );
}

interface NumberFieldWithUnitProps extends NumberFieldProps {
  unit?: React.ReactNode;
}

export function NumberFieldWithUnit(props: NumberFieldWithUnitProps) {
  const {
    name,
    label,
    invalid,
    cols,
    disabled,
    defaultValue,
    onChange,
    unit,
    min,
    max,
    step,
    value,
  } = props;

  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation="horizontal"
        invalid={invalid}
        disabled={disabled}
      >
        <Field.Label>
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        </Field.Label>
        <HStack flex="1" maxW="1/2">
          <NumberInput.Root
            name={name}
            min={min}
            max={max}
            step={step}
            value={value}
            defaultValue={defaultValue}
            size="sm"
            flex="1"
            onValueChange={(e) => onChange?.(e.value)}
            borderColor="brand.outlineVariant"
            color="teal.solid"
          >
            <NumberInput.Control />
            <Box
              pos="absolute"
              top="1.5"
              fontSize="sm"
              right="8"
              color="teal.solid"
            >
              {unit}
            </Box>
            <NumberInput.Input pe="14" />
          </NumberInput.Root>
        </HStack>
      </Field.Root>
    </GridItem>
  );
}

interface ColorFieldProps extends BaseFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function ColorField(props: ColorFieldProps) {
  const {
    name,
    label,
    invalid,
    cols,
    disabled,
    defaultValue,
    onChange,
    value,
  } = props;
  return (
    <GridItem colSpan={cols || 1}>
      <Field.Root
        orientation="horizontal"
        invalid={invalid}
        disabled={disabled}
      >
        <Field.Label>
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        </Field.Label>
        <ColorPicker.Root
          name={name}
          value={value ? parseColor(value) : undefined}
          defaultValue={parseColor(defaultValue || "rgba(0,0,0,1)")}
          format="hsla"
          flex="1"
          maxW="1/2"
          size="sm"
          onValueChange={(e) => onChange?.(e.valueAsString)}
          borderColor="brand.outlineVariant"
          color="gray.focusRing"
        >
          <ColorPicker.HiddenInput />
          <ColorPicker.Control>
            <InputGroup
              endElement={
                <ColorPicker.Trigger data-fit-content>
                  <ColorPicker.ValueSwatch boxSize="4.5" />
                </ColorPicker.Trigger>
              }
            >
              <ColorPicker.Input />
            </InputGroup>
          </ColorPicker.Control>
          <ColorPicker.Positioner>
            <ColorPicker.Content colorPalette="gray">
              <ColorPicker.Area />
              <HStack>
                <ColorPicker.EyeDropper size="sm" variant="outline" />
                <ColorPicker.Sliders />
                <ColorPicker.ValueSwatch />
              </HStack>
            </ColorPicker.Content>
          </ColorPicker.Positioner>
        </ColorPicker.Root>
      </Field.Root>
    </GridItem>
  );
}

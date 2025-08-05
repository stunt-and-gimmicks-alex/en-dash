import { Button, Card, Field, Input, Tabs, Textarea } from "@chakra-ui/react";
import type { CardTabFill } from "@/types/components";
import type React from "react";
import type { JSX } from "@emotion/react/jsx-runtime";

interface CardWithTabsProps {
  tabs: CardTabFill[];
}

export const CardWithTabs: React.FC<CardWithTabsProps> = ({ tabs }) => {
  function buildInput(
    type: string,
    isdisabled: boolean,
    dVal?: string
  ): JSX.Element | null {
    switch (type) {
      case "text":
        return (
          <Input
            defaultValue={dVal}
            disabled={isdisabled}
            variant="subtle"
            colorPalette="grayBrand"
          />
        );
      case "textarea":
        return (
          <Textarea
            defaultValue={dVal}
            autoresize
            disabled={isdisabled}
            variant="subtle"
          />
        );
      case "password":
        return <Input type="password" />;
      default:
        return null;
    }
  }
  return (
    <Card.Root variant="subtle">
      <Tabs.Root defaultValue={tabs[0].value} size="sm" variant="line">
        <Tabs.List mx="6" pt="2">
          {tabs.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              flex="1"
              justifyContent="center"
            >
              {t.value}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map((t) => (
          <>
            <Tabs.Content value={t.value}>
              <Card.Header flexShrink={0} py="3">
                <Card.Title>{t.title}</Card.Title>
                <Card.Description>{t.description}</Card.Description>
              </Card.Header>
              <Card.Body gap="4" flex="1" overflowY="auto" h="47dvh">
                {t.field.map((f) => (
                  <Field.Root orientation={f.orientation}>
                    <Field.Label>{f.label}</Field.Label>
                    {buildInput(f.type, f.status, f.defaultvalue)}
                    <Field.HelperText>{f.helpertext}</Field.HelperText>
                  </Field.Root>
                ))}
              </Card.Body>
              <Card.Footer py="3" flexShrink={0}>
                {t.button.map((b) => (
                  <Button
                    width="full"
                    colorPalette={b.colorpalette}
                    variant={b.variant}
                    onClick={b.onClick}
                    disabled={b.status}
                  >
                    {b.value}
                  </Button>
                ))}
              </Card.Footer>
            </Tabs.Content>
          </>
        ))}
      </Tabs.Root>
    </Card.Root>
  );
};

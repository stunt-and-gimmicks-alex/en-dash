export interface CardTabFill {
  value: string;
  title: string;
  description?: string;
  field: {
    type: "text" | "textarea" | "password";
    orientation: "vertical" | "horizontal";
    status: boolean;
    label: string;
    defaultvalue?: any;
    helpertext?: string;
  }[];
  button: {
    colorpalette?: string;
    size?: "xs" | "sm" | "md" | "lg";
    variant?: "solid" | "ghost" | "outline" | "plain";
    icon?: string;
    value: string;
    onClick?: () => void;
    status: boolean;
  }[];
}

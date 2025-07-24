import { ChakraProvider } from "@chakra-ui/react";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";
import { system } from "@/theme";

export interface ProviderProps extends ColorModeProviderProps {
    children: React.ReactNode;
}

export function Provider(props: ProviderProps) {
    return (
        <ChakraProvider value={system}>
            <ColorModeProvider {...props} />
        </ChakraProvider>
    );
}

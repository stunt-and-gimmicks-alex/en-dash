// src/App.tsx - Updated to use the new Layout with navigation
import React from "react";
import { Box } from "@chakra-ui/react";
import { Layout } from "./components/Layout";

const App = () => {
    return (
        <Box minH="100vh" bg="white">
            <Layout />
        </Box>
    );
};

export default App;

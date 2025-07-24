// src/components/pages/DockerOverview.tsx - Updated to use column/content pattern
import React from "react";
import { DockerOverviewColumn } from "./DockerOverviewColumn";
import { DockerOverviewContent } from "./DockerOverviewContent";

export const DockerOverview: React.FC = () => {
    return (
        <>
            <DockerOverviewColumn />
            <DockerOverviewContent />
        </>
    );
};

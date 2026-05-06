import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/goals")({
  component: () => <Navigate to="/hq" />,
});


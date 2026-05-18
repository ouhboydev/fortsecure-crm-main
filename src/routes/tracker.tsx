import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/tracker")({
  component: () => <TrackerRedirect />,
});

function TrackerRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/activities" });
  }, [navigate]);
  return null;
}

import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/selah/setup")({
  beforeLoad: () => {
    throw redirect({
      to: "/selah/extensions",
      replace: true,
    })
  },
  component: () => null,
})


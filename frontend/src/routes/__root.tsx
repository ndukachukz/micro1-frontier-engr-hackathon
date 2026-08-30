import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-8 py-3">
          <Link to="/" className="font-semibold">
            Chata
          </Link>
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
            Orders
          </Link>
          <Link
            to="/eval"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Evaluation
          </Link>
          <a
            href={`${import.meta.env.VITE_API_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            API docs ↗
          </a>
        </div>
      </nav>
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  );
}

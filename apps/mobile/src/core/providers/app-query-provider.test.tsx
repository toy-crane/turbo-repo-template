import { describe, expect, test } from "@jest/globals";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppQueryProvider } from "./app-query-provider";

function QueryClientProbe({
  onClient,
}: {
  onClient: (client: QueryClient) => void;
}) {
  onClient(useQueryClient());

  return <Text>probe</Text>;
}

async function mountProbe(onClient: (client: QueryClient) => void) {
  const view = await render(
    <AppQueryProvider>
      <QueryClientProbe onClient={onClient} />
    </AppQueryProvider>
  );

  expect(screen.getByText("probe")).toBeOnTheScreen();
  await view.unmount();
}

describe("AppQueryProvider", () => {
  test("자식 트리에 query client를 제공한다", async () => {
    let client: QueryClient | undefined;

    await mountProbe((next) => {
      client = next;
    });

    expect(client).toBeDefined();
  });

  test("다시 마운트해도 같은 query client를 유지한다", async () => {
    const clients: QueryClient[] = [];
    const collect = (client: QueryClient) => {
      clients.push(client);
    };

    await mountProbe(collect);
    await mountProbe(collect);

    expect(clients[1]).toBe(clients[0]);
  });
});

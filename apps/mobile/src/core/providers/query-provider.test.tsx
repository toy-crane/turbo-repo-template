import { afterEach, describe, expect, test } from "@jest/globals";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { createTestQueryClient } from "@/shared/test/render-with-heroui";
import { QueryProvider, queryClient } from "./query-provider";

afterEach(() => {
  queryClient.clear();
});

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
    <QueryProvider>
      <QueryClientProbe onClient={onClient} />
    </QueryProvider>
  );

  expect(screen.getByText("probe")).toBeOnTheScreen();
  await view.unmount();
}

describe("QueryProvider", () => {
  test("테스트 캐시는 자동 정리 timer를 만들지 않는다", () => {
    const client = createTestQueryClient();

    expect(client.getDefaultOptions().queries?.gcTime).toBe(
      Number.POSITIVE_INFINITY
    );
    expect(client.getDefaultOptions().mutations?.gcTime).toBe(
      Number.POSITIVE_INFINITY
    );
  });

  test("일반 쿼리는 1분 동안 최신 상태를 유지한다", () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

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

import { expect, test } from "bun:test"

test("provides the favicon through the App Router icon convention", async () => {
  const appIcon = Bun.file(new URL("../app/icon.svg", import.meta.url))
  const legacyIcon = Bun.file(new URL("../public/favicon.svg", import.meta.url))

  expect(await appIcon.exists()).toBe(true)
  expect(await legacyIcon.exists()).toBe(false)
  expect(await appIcon.text()).toContain("<svg")
})

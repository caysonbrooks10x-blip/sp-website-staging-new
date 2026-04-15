/**
 * Stateful mock HTTP servers for ApiMart + Poyo.
 *
 * Used by the Sprint A integration harness to exercise the real
 * Next.js route handlers end-to-end without hitting live providers.
 * Each mock is programmable per-test: set a scenario before the
 * scenario runs, and the server replies according to the script.
 *
 * This is test-only code — not imported by the app. Pure node:http,
 * no Express, no extra dependencies.
 */

import http from "node:http"
import type { AddressInfo } from "node:net"

export type ApimartScript =
  | { kind: "ok-task"; taskId: string; pollOk?: boolean; pollStatus?: "completed" | "failed" | "processing"; imageUrl?: string }
  | { kind: "ok-direct"; imageUrl: string }
  | { kind: "fail-n-then-ok"; failN: number; status: number; taskId: string; imageUrl: string }
  | { kind: "always-fail"; status: number; message: string }
  | { kind: "always-503" }

export type PoyoScript =
  | { kind: "ok"; taskId: string }
  | { kind: "fail-n-then-ok"; failN: number; status: number; taskId: string }
  | { kind: "always-fail"; status: number; message: string }

export interface MockRequest {
  method: string
  path: string
  headers: Record<string, string>
  body: any
}

export interface MockProvider {
  url: string
  port: number
  close: () => Promise<void>
  setScript: (script: ApimartScript | PoyoScript) => void
  callCount: () => number
  resetCallCount: () => void
  requestLog: () => MockRequest[]
  clearLog: () => void
}

function readJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (c) => chunks.push(c as Buffer))
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8")
      if (!text) return resolve({})
      try {
        resolve(JSON.parse(text))
      } catch (err) {
        reject(err)
      }
    })
    req.on("error", reject)
  })
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify(body))
}

export async function startMockApimart(initial: ApimartScript): Promise<MockProvider> {
  let script = initial
  let calls = 0
  let attemptCounter = 0
  const log: MockRequest[] = []

  const server = http.createServer(async (req, res) => {
    calls += 1
    const url = new URL(req.url || "/", "http://localhost")
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers[k] = v
      else if (Array.isArray(v)) headers[k] = v.join(",")
    }
    const bodyPromise = req.method === "POST" ? readJson(req).catch(() => ({})) : Promise.resolve(null)
    const body = await bodyPromise
    log.push({ method: req.method || "GET", path: url.pathname, headers, body })

    // Task status endpoint: GET /v1/tasks/{id} or /tasks/{id}
    if (req.method === "GET" && /\/tasks\/[^/]+$/.test(url.pathname)) {
      if (script.kind === "ok-task") {
        const status = script.pollStatus ?? "completed"
        return sendJson(res, 200, {
          code: 0,
          data: {
            id: script.taskId,
            status,
            progress: status === "completed" ? 1 : 0.5,
            result: status === "completed" ? { images: [{ url: [script.imageUrl ?? "https://mock.test/out.png"] }] } : undefined,
            error: status === "failed" ? { message: "mock failure" } : undefined,
          },
        })
      }
      if (script.kind === "fail-n-then-ok") {
        return sendJson(res, 200, {
          code: 0,
          data: {
            id: script.taskId,
            status: "completed",
            progress: 1,
            result: { images: [{ url: [script.imageUrl] }] },
          },
        })
      }
      return sendJson(res, 404, { error: "no task" })
    }

    // Image OR video generation endpoints.
    if (
      req.method === "POST" &&
      (/\/images\/generations$/.test(url.pathname) || /\/videos\/generations$/.test(url.pathname))
    ) {
      if (script.kind === "ok-direct") {
        return sendJson(res, 200, { code: 0, data: [{ url: script.imageUrl }] })
      }
      if (script.kind === "ok-task") {
        return sendJson(res, 200, { code: 0, data: [{ task_id: script.taskId, status: "pending" }] })
      }
      if (script.kind === "fail-n-then-ok") {
        attemptCounter += 1
        if (attemptCounter <= script.failN) {
          return sendJson(res, script.status, { error: { message: `mock retryable failure (attempt ${attemptCounter})` } })
        }
        return sendJson(res, 200, { code: 0, data: [{ task_id: script.taskId, status: "pending" }] })
      }
      if (script.kind === "always-fail") {
        return sendJson(res, script.status, { error: { message: script.message } })
      }
      if (script.kind === "always-503") {
        return sendJson(res, 503, { error: { message: "503 temporarily unavailable" } })
      }
    }

    return sendJson(res, 404, { error: "mock route not found" })
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    port: address.port,
    close: () => new Promise((resolve) => server.close(() => resolve())),
    setScript: (next) => {
      script = next as ApimartScript
      attemptCounter = 0
    },
    callCount: () => calls,
    resetCallCount: () => {
      calls = 0
      attemptCounter = 0
    },
    requestLog: () => [...log],
    clearLog: () => {
      log.length = 0
    },
  }
}

export async function startMockPoyo(initial: PoyoScript): Promise<MockProvider> {
  let script = initial
  let calls = 0
  let submitAttemptCounter = 0
  const log: MockRequest[] = []

  const server = http.createServer(async (req, res) => {
    calls += 1
    const url = new URL(req.url || "/", "http://localhost")
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers[k] = v
      else if (Array.isArray(v)) headers[k] = v.join(",")
    }
    const bodyPromise = req.method === "POST" ? readJson(req).catch(() => ({})) : Promise.resolve(null)
    const body = await bodyPromise
    log.push({ method: req.method || "GET", path: url.pathname, headers, body })

    if (req.method === "POST" && /\/api\/generate\/submit$/.test(url.pathname)) {
      if (script.kind === "ok") {
        return sendJson(res, 200, { task_id: script.taskId, state: "queued" })
      }
      if (script.kind === "fail-n-then-ok") {
        submitAttemptCounter += 1
        if (submitAttemptCounter <= script.failN) {
          return sendJson(res, script.status, { message: `mock retryable failure (attempt ${submitAttemptCounter})` })
        }
        return sendJson(res, 200, { task_id: script.taskId, state: "queued" })
      }
      if (script.kind === "always-fail") {
        return sendJson(res, script.status, { message: script.message })
      }
    }

    if (req.method === "GET" && /\/api\/generate\/status\//.test(url.pathname)) {
      if (script.kind === "ok") {
        return sendJson(res, 200, {
          task_id: script.taskId,
          state: "completed",
          progress: 1,
          outputs: [{ url: "https://mock.test/poyo.png", type: "image" }],
        })
      }
      return sendJson(res, 404, { message: "not found" })
    }

    return sendJson(res, 404, { message: "mock route not found" })
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${address.port}`,
    port: address.port,
    close: () => new Promise((resolve) => server.close(() => resolve())),
    setScript: (next) => {
      script = next as PoyoScript
      submitAttemptCounter = 0
    },
    callCount: () => calls,
    resetCallCount: () => {
      calls = 0
      submitAttemptCounter = 0
    },
    requestLog: () => [...log],
    clearLog: () => {
      log.length = 0
    },
  }
}

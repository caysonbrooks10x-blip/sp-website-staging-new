import { NextResponse } from "next/server"
import {
  ApiMartRequestError,
  queryApiMartTaskStatus,
  submitApiMartImageGeneration,
} from "@/lib/apimart"
import { adaptApimartStatus, adaptApimartSubmission, newRequestId } from "@/lib/provider-response"

export const runtime = "nodejs"

interface ExtractBody {
  imageUrl?: string
  notes?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ExtractBody
    const imageUrl = payload?.imageUrl?.trim()

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 })
    }

    const notesClause = payload?.notes?.trim()
      ? ` Keep identity cues consistent with these notes: ${payload.notes.trim()}.`
      : ""

    const prompt =
      "Extract a clean neutral character reference portrait from the input image. Preserve face shape, skin tone, hair, and wardrobe identity. Remove distracting background. Keep studio lighting and centered framing for future consistency runs." +
      notesClause

    const requestId = newRequestId()
    const ctx = { provider: "apimart", model: "nano-banana-2-new", request_id: requestId }

    const submitted = await submitApiMartImageGeneration({
      model: "nano-banana-2-new",
      prompt,
      image_url: imageUrl,
      size: "1:1",
      resolution: "1080p",
      output_format: "png",
      n: 1,
    })

    const submission = adaptApimartSubmission(submitted, ctx)

    if (submission.kind === "direct") {
      const url = submission.canonical.urls[0]
      if (!url) {
        return NextResponse.json(
          { error: "ApiMart direct extraction response did not include a URL." },
          { status: 502 }
        )
      }
      return NextResponse.json({
        status: "completed",
        provider: "apimart",
        model: "nano-banana-2-new",
        request_id: requestId,
        extractedImageUrl: url,
      })
    }

    const taskId = submission.taskId
    if (!taskId) {
      return NextResponse.json({ error: "ApiMart did not return an extraction task ID." }, { status: 502 })
    }

    const maxAttempts = 40
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const raw = await queryApiMartTaskStatus(taskId, "en")
      const canonical = adaptApimartStatus(raw, ctx)

      if (canonical.status === "failed") {
        return NextResponse.json(
          { error: canonical.error || "Character extraction failed.", taskId, request_id: requestId },
          { status: 502 }
        )
      }

      if (canonical.status === "completed") {
        const url = canonical.urls[0]
        if (!url) {
          return NextResponse.json(
            { error: "Character extraction completed but no image URL was returned.", taskId, request_id: requestId },
            { status: 502 }
          )
        }
        return NextResponse.json({
          status: "completed",
          provider: "apimart",
          model: "nano-banana-2-new",
          taskId,
          request_id: requestId,
          extractedImageUrl: url,
        })
      }

      await sleep(2000)
    }

    return NextResponse.json(
      {
        status: "processing",
        provider: "apimart",
        model: "nano-banana-2-new",
        taskId,
        request_id: requestId,
        message: "Extraction is still processing. Retry shortly.",
      },
      { status: 202 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "ApiMart character extraction failed"
    const status = error instanceof ApiMartRequestError && error.status ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}


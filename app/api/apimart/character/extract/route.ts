import { NextResponse } from "next/server"
import {
  ApiMartRequestError,
  queryApiMartTaskStatus,
  submitApiMartImageGeneration,
  type ApiMartDirectImageResponse,
  type ApiMartSubmissionResponse,
} from "@/lib/apimart"

export const runtime = "nodejs"

interface ExtractBody {
  imageUrl?: string
  notes?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function firstTaskId(result: ApiMartSubmissionResponse) {
  return Array.isArray(result?.data) ? result.data[0]?.task_id : undefined
}

function firstDirectUrl(result: ApiMartDirectImageResponse) {
  if (!Array.isArray(result?.data)) return undefined
  for (const entry of result.data) {
    if (entry?.url) return entry.url
  }
  return undefined
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

    const submitted = await submitApiMartImageGeneration({
      model: "nano-banana-2-new",
      prompt,
      image_url: imageUrl,
      size: "1:1",
      resolution: "1080p",
      output_format: "png",
      n: 1,
    })

    if ("created" in submitted) {
      const directUrl = firstDirectUrl(submitted)
      if (!directUrl) {
        return NextResponse.json(
          { error: "ApiMart direct extraction response did not include a URL." },
          { status: 502 }
        )
      }

      return NextResponse.json({
        status: "completed",
        provider: "apimart",
        model: "nano-banana-2-new",
        extractedImageUrl: directUrl,
      })
    }

    const taskId = firstTaskId(submitted)
    if (!taskId) {
      return NextResponse.json({ error: "ApiMart did not return an extraction task ID." }, { status: 502 })
    }

    const maxAttempts = 40
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await queryApiMartTaskStatus(taskId, "en")
      const task = status?.data
      const taskState = task?.status

      if (taskState === "failed" || taskState === "cancelled") {
        const message = task?.error?.message || task?.error?.type || "Character extraction failed."
        return NextResponse.json({ error: message, taskId }, { status: 502 })
      }

      if (taskState === "completed") {
        const imageGroups = Array.isArray(task?.result?.images) ? task.result.images : []
        const extractedImageUrl = imageGroups[0]?.url?.[0]
        if (!extractedImageUrl) {
          return NextResponse.json(
            { error: "Character extraction completed but no image URL was returned.", taskId },
            { status: 502 }
          )
        }

        return NextResponse.json({
          status: "completed",
          provider: "apimart",
          model: "nano-banana-2-new",
          taskId,
          extractedImageUrl,
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


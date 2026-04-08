"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import JSZip from "jszip"
import { useSearchParams } from "next/navigation"
import { Download, Loader2, Package, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  buildExportPackFilename,
  getRecommendedExportPresets,
  normalizeExportPresetIds,
  resolveExportPackPresets,
} from "@/lib/export-pack"
import type { CommunityCampaignMeta } from "@/lib/types"

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load source image"))
    image.src = url
  })
}

async function fetchAssetBlob(assetUrl: string): Promise<Blob> {
  const response = await fetch(`/api/download?url=${encodeURIComponent(assetUrl)}`)
  if (!response.ok) {
    throw new Error("Failed to fetch the asset through the StudioX proxy")
  }
  return response.blob()
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType = "image/jpeg", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Could not build export image"))
    }, mimeType, quality)
  })
}

function getAssetExtension(assetUrl: string, fallback: string): string {
  try {
    const pathname = new URL(assetUrl).pathname.toLowerCase()
    const ext = pathname.split(".").pop()
    if (ext) return ext
  } catch {
    // Ignore malformed URLs and use fallback.
  }
  return fallback
}

async function buildImageVariant(blob: Blob, width: number, height: number): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = await loadImage(objectUrl)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Canvas context is unavailable")
    }

    context.fillStyle = "#050508"
    context.fillRect(0, 0, width, height)

    const scale = Math.max(width / image.width, height / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    const offsetX = (width - drawWidth) / 2
    const offsetY = (height - drawHeight) / 2

    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

    return canvasToBlob(canvas)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function ExportPackPage() {
  const searchParams = useSearchParams()
  const [isPreparing, setIsPreparing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const hasAutoDownloadedRef = useRef(false)

  const payload = useMemo(() => {
    const urls = searchParams.getAll("assetUrl").filter((url) => url.length > 0)
    const assetCreationIds = searchParams.getAll("assetCreationId")
    const legacyCreationId = searchParams.get("creationId") || ""
    const assets = urls.map((url, index) => ({
      url,
      creationId: assetCreationIds[index] || (index === 0 ? legacyCreationId || undefined : undefined),
    }))

    const campaign: CommunityCampaignMeta = {
      directed: searchParams.get("campaignDirected") === "1",
      goal: searchParams.get("campaignGoal") || undefined,
      platform: searchParams.get("campaignPlatform") || undefined,
      style: searchParams.get("campaignStyle") || undefined,
      variationCount: searchParams.get("campaignVariationCount")
        ? Number(searchParams.get("campaignVariationCount"))
        : undefined,
      brief: searchParams.get("campaignBrief") || undefined,
      presetIds: normalizeExportPresetIds(searchParams.get("campaignPresetIds")),
    }

    return {
      assetUrl: assets[0]?.url || "",
      assets,
      type: (searchParams.get("type") as "image" | "video" | null) || "image",
      prompt: searchParams.get("prompt") || "",
      title: searchParams.get("title") || "StudioX Campaign Export",
      model: searchParams.get("model") || "",
      aspect: searchParams.get("aspect") || "",
      creationId: assets[0]?.creationId || legacyCreationId,
      generationPlatform: searchParams.get("generationPlatform") || "",
      autoDownload: searchParams.get("autoDownload") === "1",
      campaign,
      presetIds: normalizeExportPresetIds(searchParams.get("campaignPresetIds")),
    }
  }, [searchParams])

  const recommendedPresets = useMemo(
    () => getRecommendedExportPresets(payload.campaign),
    [payload.campaign]
  )

  const selectedPresets = useMemo(
    () =>
      resolveExportPackPresets({
        type: payload.type,
        campaign: payload.campaign,
        presetIds: payload.presetIds,
      }),
    [payload.campaign, payload.presetIds, payload.type]
  )

  const handleDownloadPack = useCallback(async () => {
    if (!payload.assetUrl) return

    setIsPreparing(true)
    setStatus("Preparing your export pack...")

    try {
      const zip = new JSZip()
      const sourceAssets = payload.assets.length > 0 ? payload.assets : [{ url: payload.assetUrl, creationId: payload.creationId }]
      const filenameSeed = buildExportPackFilename(payload.title, payload.creationId)
      const filenameBase = sourceAssets.length > 1 ? `${filenameSeed}-set-${sourceAssets.length}` : filenameSeed
      const resolvedSources: Array<{
        url: string
        creationId?: string
        blob: Blob
        extension: string
      }> = []

      for (let index = 0; index < sourceAssets.length; index += 1) {
        const source = sourceAssets[index]
        setStatus(`Fetching source ${index + 1} of ${sourceAssets.length}...`)
        const blob = await fetchAssetBlob(source.url)
        resolvedSources.push({
          url: source.url,
          creationId: source.creationId,
          blob,
          extension: getAssetExtension(source.url, payload.type === "video" ? "mp4" : "jpg"),
        })
      }

      zip.file(
        "campaign-brief.json",
        JSON.stringify(
          {
            title: payload.title,
            prompt: payload.prompt,
            model: payload.model,
            generationPlatform: payload.generationPlatform,
            aspect: payload.aspect,
            creationId: payload.creationId,
            sourceAssets: resolvedSources.map((source, index) => ({
              index: index + 1,
              url: source.url,
              creationId: source.creationId || null,
              extension: source.extension,
            })),
            campaign: payload.campaign,
            selectedPresetIds: selectedPresets.map((preset) => preset.id),
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        )
      )

      zip.file(
        "README.txt",
        [
          "StudioX Campaign Export Pack",
          "",
          `Title: ${payload.title}`,
          `Model: ${payload.model || "Unknown"}`,
          `Generation Platform: ${payload.generationPlatform || "Unknown"}`,
          `Aspect: ${payload.aspect || "Auto"}`,
          payload.campaign.goal ? `Goal: ${payload.campaign.goal}` : "",
          payload.campaign.platform ? `Primary Platform: ${payload.campaign.platform}` : "",
          payload.campaign.style ? `Style: ${payload.campaign.style}` : "",
          payload.prompt ? `Prompt: ${payload.prompt}` : "",
          `Source assets: ${resolvedSources.length}`,
          "",
          payload.type === "image"
            ? `Included: ${resolvedSources.length} source image(s) + ${selectedPresets.length} selected variant(s) per source.`
            : "Included: original video asset + campaign brief for manual downstream resizing.",
        ]
          .filter(Boolean)
          .join("\n")
      )

      for (let sourceIndex = 0; sourceIndex < resolvedSources.length; sourceIndex += 1) {
        const source = resolvedSources[sourceIndex]
        const sourceName =
          resolvedSources.length === 1
            ? `source/original.${source.extension}`
            : `source/original-${String(sourceIndex + 1).padStart(2, "0")}.${source.extension}`
        zip.file(sourceName, source.blob)
      }

      if (payload.type === "image") {
        for (let sourceIndex = 0; sourceIndex < resolvedSources.length; sourceIndex += 1) {
          const source = resolvedSources[sourceIndex]
          for (const preset of selectedPresets) {
            setStatus(`Building ${preset.label} for source ${sourceIndex + 1}/${resolvedSources.length}...`)
            const variantBlob = await buildImageVariant(source.blob, preset.width, preset.height)
            const variantName =
              resolvedSources.length === 1
                ? `variants/${preset.id}.jpg`
                : `variants/source-${String(sourceIndex + 1).padStart(2, "0")}/${preset.id}.jpg`
            zip.file(variantName, variantBlob)
          }
        }
      } else {
        zip.file(
          "video-export-notes.txt",
          [
            "Video pack note",
            "",
            `The original video assets are included (${resolvedSources.length} file${resolvedSources.length === 1 ? "" : "s"}).`,
            "For video-safe reframing, the next phase should add provider-side or editor-side transcoding.",
            "This MVP pack gives you the original plus the campaign brief and platform notes.",
          ].join("\n")
        )
      }

      setStatus("Compressing ZIP...")
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const downloadUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${filenameBase}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
      setStatus("Export pack downloaded.")
    } catch (error) {
      console.error("Export pack creation failed:", error)
      setStatus(error instanceof Error ? error.message : "Could not build the export pack.")
    } finally {
      setIsPreparing(false)
    }
  }, [payload])

  useEffect(() => {
    if (!payload.autoDownload || !payload.assetUrl || hasAutoDownloadedRef.current) return
    hasAutoDownloadedRef.current = true
    void handleDownloadPack()
  }, [handleDownloadPack, payload.assetUrl, payload.autoDownload])

  if (!payload.assetUrl) {
    return (
      <main className="min-h-screen bg-[#050508] text-white flex items-center justify-center px-6">
        <div className="max-w-xl text-center space-y-4">
          <Package className="w-10 h-10 mx-auto text-zinc-500" />
          <h1 className="text-3xl font-semibold">Export Pack Unavailable</h1>
          <p className="text-zinc-400">This page needs an asset URL to build the campaign bundle.</p>
          <Button asChild className="bg-white text-black hover:bg-zinc-200">
            <Link href="/studio">Back to Studio</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050508] text-white px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            Campaign Export Pack
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{payload.title}</h1>
          <p className="max-w-3xl text-zinc-400 leading-relaxed">
            Download a ready-to-share StudioX bundle with the source asset, creative brief, and platform outputs.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Campaign Brief</p>
              <h2 className="text-2xl font-semibold">{payload.campaign.goal || "General Creative Export"}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Primary Platform</p>
                <p className="mt-2 text-lg font-medium">{payload.campaign.platform || "Multi-platform"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Style Direction</p>
                <p className="mt-2 text-lg font-medium">{payload.campaign.style || "Original StudioX style"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Model</p>
                <p className="mt-2 text-lg font-medium">{payload.model || "Unknown"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Generation Platform</p>
                <p className="mt-2 text-lg font-medium">{payload.generationPlatform || "Unknown"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Aspect</p>
                <p className="mt-2 text-lg font-medium">{payload.aspect || "Auto"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Source Assets</p>
                <p className="mt-2 text-lg font-medium">{payload.assets.length}</p>
              </div>
            </div>

            {payload.prompt ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Prompt</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{payload.prompt}</p>
              </div>
            ) : null}
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Included</p>
              <h2 className="text-2xl font-semibold">
                {payload.type === "image"
                  ? payload.assets.length > 1
                    ? `${payload.assets.length} x ${selectedPresets.length} variants`
                    : `${selectedPresets.length} image variants`
                  : "Video source pack"}
              </h2>
            </div>

            <div className="space-y-3">
              {recommendedPresets.length > 0 ? (
                <div className="rounded-2xl border border-lime-400/20 bg-lime-400/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-lime-300">Director Recommendation</p>
                  <p className="mt-2 text-sm text-zinc-200">
                    Best first exports: {recommendedPresets.map((preset) => preset.label).join(" + ")}
                  </p>
                </div>
              ) : null}
              {payload.type === "image" ? (
                selectedPresets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div>
                      <p className="font-medium">{preset.label}</p>
                      <p className="text-sm text-zinc-500">{preset.width} x {preset.height}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{preset.platform}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-zinc-300">
                  The MVP video pack includes the original video, campaign brief, and export notes. Proper automated reframing is the next phase.
                </div>
              )}
              {payload.assets.length > 1 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  Batch mode is enabled. This ZIP will include every generated source plus platform variants for each source.
                </div>
              ) : null}
            </div>

            <Button
              onClick={handleDownloadPack}
              disabled={isPreparing}
              className="w-full h-12 rounded-2xl bg-[#c8ff00] text-black hover:bg-[#b8ef00] font-semibold"
            >
              {isPreparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download ZIP
            </Button>

            {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
          </aside>
        </div>
      </div>
    </main>
  )
}

import { Upload } from "lucide-react"

interface MediaPlaceholderProps {
  aspect?: "square" | "video"
  className?: string
}

export function MediaPlaceholder({ aspect = "square", className = "" }: MediaPlaceholderProps) {
  const aspectClass = aspect === "video" ? "aspect-video" : "aspect-square"

  return (
    <div
      className={`${aspectClass} ${className} bg-secondary/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-center`}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">No image uploaded</p>
        <p className="text-xs text-muted-foreground">Upload an image or video</p>
      </div>
    </div>
  )
}

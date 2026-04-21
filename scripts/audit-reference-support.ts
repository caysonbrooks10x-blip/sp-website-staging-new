import { IMAGE_MODEL_LIST, VIDEO_MODEL_LIST } from "../lib/model-config"
import { MODEL_CAPABILITIES } from "../lib/model-capabilities"

type Row = {
  id: string
  kind: "image" | "video"
  cfgRefImg: boolean
  cfgRefVid: boolean
  capRefImgRequired: boolean
  capRefImgForbidden: boolean
  capPresent: boolean
}

const rows: Row[] = []
for (const m of IMAGE_MODEL_LIST as any[]) {
  const caps = MODEL_CAPABILITIES[m.id]
  rows.push({
    id: m.id,
    kind: "image",
    cfgRefImg: !!m.supportsReferenceImage,
    cfgRefVid: false,
    capRefImgRequired: !!caps?.requiresReferenceImage,
    capRefImgForbidden: !!caps?.forbidsReferenceImage,
    capPresent: !!caps,
  })
}
for (const m of VIDEO_MODEL_LIST as any[]) {
  const caps = MODEL_CAPABILITIES[m.id]
  rows.push({
    id: m.id,
    kind: "video",
    cfgRefImg: !!m.supportsReferenceImage,
    cfgRefVid: !!m.supportsReferenceVideo,
    capRefImgRequired: !!caps?.requiresReferenceImage,
    capRefImgForbidden: !!caps?.forbidsReferenceImage,
    capPresent: !!caps,
  })
}

console.log("id | kind | cfg.refImg | cfg.refVid | cap.required | cap.forbidden | cap?")
console.log("---")
for (const r of rows) {
  console.log(
    `${r.id} | ${r.kind} | ${r.cfgRefImg} | ${r.cfgRefVid} | ${r.capRefImgRequired} | ${r.capRefImgForbidden} | ${r.capPresent}`,
  )
}

console.log("\n=== DRIFT ===")
const drift: string[] = []
for (const r of rows) {
  if (!r.capPresent) {
    drift.push(`${r.id}: no MODEL_CAPABILITIES entry`)
    continue
  }
  if (r.cfgRefImg && r.capRefImgForbidden) {
    drift.push(`${r.id}: config says supportsReferenceImage but caps forbid it`)
  }
  if (!r.cfgRefImg && r.capRefImgRequired) {
    drift.push(`${r.id}: caps REQUIRE reference image but config says unsupported`)
  }
}
if (drift.length === 0) console.log("(no drift)")
else drift.forEach((d) => console.log(" - " + d))

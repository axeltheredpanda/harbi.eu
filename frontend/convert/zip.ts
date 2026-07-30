import JSZip from "jszip";

export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadFilesAsZip(
  files: { filename: string; blob: Blob }[],
  zipName = "converted.zip",
) {
  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const file of files) {
    let name = file.filename || "converted.bin";
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count > 0) {
      const dot = name.lastIndexOf(".");
      name =
        dot > 0
          ? `${name.slice(0, dot)}-${count}${name.slice(dot)}`
          : `${name}-${count}`;
    }
    zip.file(name, file.blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  await downloadBlob(blob, zipName);
}

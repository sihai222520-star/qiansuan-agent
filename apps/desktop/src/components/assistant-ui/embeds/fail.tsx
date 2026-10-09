export function EmbedFail({ label }: { label: string }) {
  return (
    <span className="grid min-h-32 w-full place-items-center p-4">
      <span className="text-xs font-medium text-(--ui-red)">{label} 嵌入加载失败</span>
    </span>
  )
}

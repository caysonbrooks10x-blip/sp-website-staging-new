export function ThemeBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)]" />
      <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
    </div>
  )
}
